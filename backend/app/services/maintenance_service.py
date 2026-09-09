from typing import List, Optional, Dict, Any
from datetime import date, datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.maintenance import MaintenanceRequest
from app.utils.validators import VALID_DEPARTMENTS, VALID_URGENCY


def _today_iso() -> str:
    return date.today().isoformat()


SEED_REQUESTS = [
    # ENG + SNT pair below is deliberately incompatible (track vs signalling)
    # so a fresh demo always shows at least one conflict AND one good club.
    {"task_id": "MT-ENG-041", "department": "ENG", "section": "Bhadrak–Jajpur", "location": "Km 231/4-232/1", "work_type": "tamping", "duration": 2.5, "urgency": "high", "description": "Plain track tamping, BHC-JJKR Up line"},
    {"task_id": "MT-SNT-018", "department": "SNT", "section": "Bhadrak–Jajpur", "location": "Jajpur Cabin", "work_type": "signal_upgrade", "duration": 2.0, "urgency": "critical", "description": "Point motor replacement + testing"},
    {"task_id": "MT-TRD-007", "department": "TRD", "section": "Bhadrak–Jajpur", "location": "Km 228/0-229/5", "work_type": "ohe_maintenance", "duration": 1.5, "urgency": "normal", "description": "OHE contact wire attention"},
    {"task_id": "MT-ENG-042", "department": "ENG", "section": "Jajpur–Keonjhar Road", "location": "Km 245/2-246/0", "work_type": "ballast_cleaning", "duration": 3.0, "urgency": "normal", "description": "Ballast screening Dn line"},
    {"task_id": "MT-TRD-011", "department": "TRD", "section": "Bhadrak–Jajpur", "location": "Km 235/0-236/2", "work_type": "ohe_maintenance", "duration": 2.0, "urgency": "high", "description": "OHE mast replacement, 2 spans"},
    {"task_id": "MT-SNT-022", "department": "SNT", "section": "Bhadrak–Jajpur", "location": "Jajpur South Cabin", "work_type": "point_maintenance", "duration": 1.0, "urgency": "normal", "description": "Point lubrication + gap check"},
    {"task_id": "MT-MECH-005", "department": "MECH", "section": "Bhadrak–Jajpur", "location": "BHC yard", "work_type": "inspection", "duration": 1.5, "urgency": "low", "description": "Rolling-stock brake inspection"},
]


class MaintenanceService:
    def list(self, db: Session, status: Optional[str] = None, section: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[MaintenanceRequest]:
        q = db.query(MaintenanceRequest)
        if status:
            q = q.filter(MaintenanceRequest.status == status)
        if section:
            q = q.filter(MaintenanceRequest.section == section)
        return q.order_by(MaintenanceRequest.created_at.desc()).offset(skip).limit(limit).all()

    def get(self, db: Session, request_id: int) -> MaintenanceRequest:
        obj = db.query(MaintenanceRequest).filter(MaintenanceRequest.id == request_id).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Maintenance request not found")
        return obj

    def get_by_task_ids(self, db: Session, task_ids: List[str]) -> List[MaintenanceRequest]:
        if not task_ids:
            return []
        return db.query(MaintenanceRequest).filter(MaintenanceRequest.task_id.in_(task_ids)).all()

    def create(self, db: Session, payload, requested_by: Optional[int] = None) -> MaintenanceRequest:
        exists = db.query(MaintenanceRequest).filter(MaintenanceRequest.task_id == payload.task_id).first()
        if exists:
            raise HTTPException(status_code=400, detail="task_id already exists")
        obj = MaintenanceRequest(**payload.model_dump(), requested_by=requested_by)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update(self, db: Session, request_id: int, payload) -> MaintenanceRequest:
        obj = self.get(db, request_id)
        for k, v in payload.model_dump(exclude_unset=True).items():
            setattr(obj, k, v)
        db.commit()
        db.refresh(obj)
        return obj

    def delete(self, db: Session, request_id: int):
        obj = self.get(db, request_id)
        db.delete(obj)
        db.commit()
        return {"deleted": request_id}

    def seed_if_empty(self, db: Session) -> int:
        if db.query(MaintenanceRequest).count() > 0:
            return 0
        today = date.today()
        for s in SEED_REQUESTS:
            db.add(MaintenanceRequest(**s, requested_date=today))
        db.commit()
        return len(SEED_REQUESTS)

    # ---------- CSV/XLSX import ----------
    def import_requests(self, db: Session, rows: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate and persist parsed maintenance-request rows.

        Required: task_id, department (known code), section, location, work_type.
        Optional: description, duration (0-12h, default 2), urgency, requested_date (ISO).
        Duplicates (existing task_id) are skipped and reported, never overwritten.
        """
        imported = 0
        duplicates = 0
        rejected = 0
        errors: List[Dict[str, Any]] = []
        seen: set = set()  # task_ids in this file (session has autoflush off)

        for i, raw in enumerate(rows, start=2):
            norm = {
                (str(k) if k is not None else "").strip().lower():
                (v.strip() if isinstance(v, str) else v)
                for k, v in (raw or {}).items()
            }
            try:
                task_id = str(norm.get("task_id") or "").strip()
                dept = str(norm.get("department") or "").strip().upper()
                section = str(norm.get("section") or "").strip()
                location = str(norm.get("location") or "").strip()
                work_type = str(norm.get("work_type") or "").strip()
                if not task_id:
                    raise ValueError("missing task_id")
                if dept not in VALID_DEPARTMENTS:
                    raise ValueError(f"unknown department '{norm.get('department')}' (use {sorted(VALID_DEPARTMENTS)})")
                if not section:
                    raise ValueError("missing section")
                if not location:
                    raise ValueError("missing location")
                if not work_type:
                    raise ValueError("missing work_type")
                try:
                    duration = float(norm.get("duration", 2.0) or 2.0)
                except (TypeError, ValueError):
                    raise ValueError(f"bad duration '{norm.get('duration')}'")
                if not 0 < duration <= 12:
                    raise ValueError("duration must be 0–12 hours")
                urgency = str(norm.get("urgency") or "normal").strip().lower()
                if urgency not in VALID_URGENCY:
                    raise ValueError(f"bad urgency '{urgency}'")
                req_date = None
                if norm.get("requested_date") not in (None, ""):
                    try:
                        req_date = date.fromisoformat(str(norm.get("requested_date")).strip())
                    except ValueError:
                        raise ValueError(f"bad requested_date '{norm.get('requested_date')}' (use YYYY-MM-DD)")
                if task_id in seen or db.query(MaintenanceRequest).filter(MaintenanceRequest.task_id == task_id).first():
                    duplicates += 1
                    continue
                seen.add(task_id)
                db.add(MaintenanceRequest(
                    task_id=task_id, department=dept, section=section, location=location,
                    work_type=work_type, description=(str(norm.get("description")).strip() if norm.get("description") not in (None, "") else None),
                    duration=duration, urgency=urgency, requested_date=req_date,
                ))
                imported += 1
            except ValueError as e:
                rejected += 1
                if len(errors) < 50:
                    errors.append({"row": i, "reason": str(e)})

        db.commit()
        return {"imported": imported, "skipped_duplicates": duplicates, "rejected": rejected, "errors": errors}

    async def get_by_ids_async(self, db: Session, task_ids: List[str]):
        # kept for ai.py compat: sync DB access wrapped as async signature
        return self.get_by_task_ids(db, task_ids)
