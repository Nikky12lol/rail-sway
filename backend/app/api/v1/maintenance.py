from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate, MaintenanceOut
from app.services.maintenance_service import MaintenanceService

router = APIRouter()
service = MaintenanceService()


@router.get("", response_model=List[MaintenanceOut])
def list_requests(status: Optional[str] = Query(None), section: Optional[str] = Query(None),
                  skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return service.list(db, status=status, section=section, skip=skip, limit=limit)


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
