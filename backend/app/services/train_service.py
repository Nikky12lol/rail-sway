from typing import List, Optional, Any, Dict
from datetime import date, datetime
from sqlalchemy.orm import Session
from app.models.train import Train
from app.services.ir_integration import IRIntegration, mock_schedule_for_section

# Columns accepted by the timetable import (case-insensitive). Only the
# starred ones are required; the rest fall back to sane defaults.
IMPORT_COLUMNS_DOC = (
    "train_number*, train_name*, scheduled_time* (ISO, e.g. 2026-09-12T08:15:00), "
    "train_type, priority (1-5), section, origin, destination, status, "
    "delay_minutes, latitude, longitude. Direction is derived as origin → destination."
)


class TrainService:
    def __init__(self):
        self.ir = IRIntegration()

    def list(self, db: Session, section: Optional[str] = None, skip: int = 0, limit: int = 200) -> List[Train]:
        q = db.query(Train)
        if section:
            q = q.filter(Train.section == section)
        rows = q.order_by(Train.scheduled_time).offset(skip).limit(limit).all()
        return rows

    async def get_for_section(self, db: Session, section: str, day: datetime | date) -> List[dict]:
        d = day.date() if isinstance(day, datetime) else day
        # Prefer DB rows for that date, else IR/mock fallback
        rows = db.query(Train).filter(Train.section == section).order_by(Train.scheduled_time).limit(200).all()
        # filter rows to requested day if any exist
        day_rows = [r for r in rows if r.scheduled_time and r.scheduled_time.date() == d]
        if day_rows:
            return [
                {
                    "id": r.train_number,
                    "train_number": r.train_number,
                    "train_name": r.train_name,
                    "train_type": r.train_type,
                    "priority": r.priority,
                    "section": r.section,
                    "scheduled_time": r.scheduled_time,
                    "status": r.status,
                    "source": r.source or "seed",
                }
                for r in day_rows
            ]
        live = await self.ir.fetch_trains(section, d)
        origin = "live" if self.ir.base_url else "demo"
        for t in live:
            t["source"] = origin
        return live

    def clear_uploaded(self, db: Session, section: Optional[str] = None, day: Optional[date] = None) -> int:
        """Delete previously uploaded timetable rows (safe replace-before-import).

        Only touches source='upload' rows, optionally scoped to section and/or
        operating date. Seed/demo rows are never deleted.
        """
        q = db.query(Train).filter(Train.source == "upload")
        if section:
            q = q.filter(Train.section == section)
        if day:
            rows = q.all()
            ids = [r.id for r in rows if r.scheduled_time and r.scheduled_time.date() == day]
            n = db.query(Train).filter(Train.id.in_(ids)).delete(synchronize_session=False) if ids else 0
            db.commit()
            return n
        n = q.delete(synchronize_session=False)
        db.commit()
        return n

    def seed_if_empty(self, db: Session, section: str = "Bhadrak–Jajpur") -> int:
        if db.query(Train).count() > 0:
            return 0
        today = date.today()
        for m in mock_schedule_for_section(section, today):
            db.add(
                Train(
                    train_number=m["train_number"],
                    train_name=m["train_name"],
                    train_type=m["train_type"],
                    priority=m["priority"],
                    section=m["section"],
                    origin=m["origin"],
                    destination=m["destination"],
                    scheduled_time=m["scheduled_time"],
                    status=m["status"],
                    delay_minutes=m["delay_minutes"],
                    latitude=m["latitude"],
                    longitude=m["longitude"],
                    source="seed",
                )
            )
        db.commit()
        return len(mock_schedule_for_section(section, today))

    # ---------- timetable import ----------
    @staticmethod
    def _parse_optional_float(value: Any, field: str) -> Optional[float]:
        if value is None or (isinstance(value, str) and not value.strip()):
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            raise ValueError(f"bad {field} '{value}'")

    def import_timetable(self, db: Session, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate, dedupe and persist parsed timetable rows.

        Returns {"imported", "skipped_duplicates", "rejected", "errors"} where
        errors is a capped list of {"row", "reason"} (row numbers are 1-based
        including the header row, matching what the operator sees in Excel).
        """
        imported = 0
        duplicates = 0
        rejected = 0
        errors: List[Dict[str, Any]] = []

        for i, raw in enumerate(rows, start=2):
            norm = {
                (str(k) if k is not None else "").strip().lower():
                (v.strip() if isinstance(v, str) else v)
                for k, v in (raw or {}).items()
            }
            try:
                num = str(norm.get("train_number") or "").strip()
                name = str(norm.get("train_name") or "").strip()
                st_raw = str(norm.get("scheduled_time") or "").strip()
                if not num:
                    raise ValueError("missing train_number")
                if not name:
                    raise ValueError("missing train_name")
                if not st_raw:
                    raise ValueError("missing scheduled_time")
                try:
                    st = datetime.fromisoformat(st_raw)
                except ValueError:
                    raise ValueError(f"bad scheduled_time '{st_raw}' (use ISO like 2026-09-12T08:15:00)")
                try:
                    prio = int(float(norm.get("priority", 3)))
                except (TypeError, ValueError):
                    raise ValueError(f"bad priority '{norm.get('priority')}'")
                if not 1 <= prio <= 5:
                    raise ValueError("priority must be 1-5")
                exists = (
                    db.query(Train)
                    .filter(Train.train_number == num, Train.scheduled_time == st)
                    .first()
                )
                if exists:
                    duplicates += 1
                    continue
                db.add(
                    Train(
                        train_number=num,
                        train_name=name,
                        train_type=str(norm.get("train_type") or "passenger").strip() or "passenger",
                        priority=prio,
                        section=str(norm.get("section") or "Bhadrak–Jajpur").strip(),
                        origin=(str(norm.get("origin")).strip() if norm.get("origin") not in (None, "") else None),
                        destination=(str(norm.get("destination")).strip() if norm.get("destination") not in (None, "") else None),
                        scheduled_time=st,
                        status=str(norm.get("status") or "on_time").strip() or "on_time",
                        delay_minutes=self._parse_optional_float(norm.get("delay_minutes"), "delay_minutes") or 0.0,
                        latitude=self._parse_optional_float(norm.get("latitude"), "latitude"),
                        longitude=self._parse_optional_float(norm.get("longitude"), "longitude"),
                        source="upload",
                    )
                )
                imported += 1
            except ValueError as e:
                rejected += 1
                if len(errors) < 50:
                    errors.append({"row": i, "reason": str(e)})

        db.commit()
        return {
            "imported": imported,
            "skipped_duplicates": duplicates,
            "rejected": rejected,
            "errors": errors,
        }
