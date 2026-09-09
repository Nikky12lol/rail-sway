from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.core.database import get_db
from app.models.maintenance import MaintenanceRequest
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate, MaintenanceOut
from app.services.maintenance_service import MaintenanceService

router = APIRouter()
service = MaintenanceService()


@router.get("", response_model=List[MaintenanceOut])
def list_requests(status: Optional[str] = Query(None), section: Optional[str] = Query(None),
                  day: Optional[date] = Query(None, description="Filter by requested operating date"),
                  skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    q = db.query(MaintenanceRequest)
    if status:
        q = q.filter(MaintenanceRequest.status == status)
    if section:
        q = q.filter(MaintenanceRequest.section == section)
    if day:
        # requested_date when set, otherwise the submission date
        q = q.filter(or_(
            MaintenanceRequest.requested_date == day,
            (MaintenanceRequest.requested_date.is_(None)) & (func.date(MaintenanceRequest.created_at) == day.isoformat()),
        ))
    if not day and not status and not section:
        return service.list(db, skip=skip, limit=limit)
    return q.order_by(MaintenanceRequest.created_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=MaintenanceOut, status_code=201)
def create_request(payload: MaintenanceCreate, db: Session = Depends(get_db)):
    return service.create(db, payload)


@router.get("/{request_id}", response_model=MaintenanceOut)
def get_request(request_id: int, db: Session = Depends(get_db)):
    return service.get(db, request_id)


@router.patch("/{request_id}", response_model=MaintenanceOut)
def update_request(request_id: int, payload: MaintenanceUpdate, db: Session = Depends(get_db)):
    return service.update(db, request_id, payload)


@router.delete("/{request_id}")
def delete_request(request_id: int, db: Session = Depends(get_db)):
    return service.delete(db, request_id)


@router.post("/seed")
def seed(db: Session = Depends(get_db)):
    n = service.seed_if_empty(db)
    return {"seeded": n}
