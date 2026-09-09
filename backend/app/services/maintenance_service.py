from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.maintenance import MaintenanceRequest


SEED_REQUESTS = [
    {"task_id": "MT-ENG-041", "department": "ENG", "section": "Bhadrak–Jajpur", "location": "Km 231/4-232/1", "work_type": "tamping", "duration": 2.5, "urgency": "high", "description": "Plain track tamping, BHC-JJKR Up line"},
    {"task_id": "MT-SNT-018", "department": "SNT", "section": "Bhadrak–Jajpur", "location": "Jajpur Cabin", "work_type": "signal_upgrade", "duration": 2.0, "urgency": "critical", "description": "Point motor replacement + testing"},
    {"task_id": "MT-TRD-007", "department": "TRD", "section": "Bhadrak–Jajpur", "location": "Km 228/0-229/5", "work_type": "ohe_maintenance", "duration": 1.5, "urgency": "normal", "description": "OHE contact wire attention"},
    {"task_id": "MT-ENG-042", "department": "ENG", "section": "Jajpur–Keonjhar Road", "location": "Km 245/2-246/0", "work_type": "ballast_cleaning", "duration": 3.0, "urgency": "normal", "description": "Ballast screening Dn line"},
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
        for s in SEED_REQUESTS:
            db.add(MaintenanceRequest(**s))
        db.commit()
        return len(SEED_REQUESTS)

    async def get_by_ids_async(self, db: Session, task_ids: List[str]):
        # kept for ai.py compat: sync DB access wrapped as async signature
        return self.get_by_task_ids(db, task_ids)
