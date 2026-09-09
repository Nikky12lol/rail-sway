from typing import List, Optional
from datetime import date, datetime
from sqlalchemy.orm import Session
from app.models.train import Train
from app.services.ir_integration import IRIntegration, mock_schedule_for_section


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
                }
                for r in day_rows
            ]
        live = await self.ir.fetch_trains(section, d)
        return live

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
                )
            )
        db.commit()
        return len(mock_schedule_for_section(section, today))
