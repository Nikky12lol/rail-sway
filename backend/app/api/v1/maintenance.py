from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from typing import Optional, List
from datetime import date
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from app.core.database import get_db
from app.models.maintenance import MaintenanceRequest
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate, MaintenanceOut, MaintenanceImportResult
from app.services.maintenance_service import MaintenanceService
from app.utils.file_import import parse_upload

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


MAINTENANCE_COLUMNS_DOC = (
    "task_id*, department* (ENG, SNT, TRD, MECH, ELEC, OPTG), section*, location*, "
    "work_type*, description, duration (0-12h, default 2), urgency (low, normal, high, critical), "
    "requested_date (YYYY-MM-DD)"
)


@router.get("/columns")
def import_columns():
    """Document the expected maintenance-request file format for the upload UI."""
    return {
        "formats": ["csv", "xlsx"],
        "columns": MAINTENANCE_COLUMNS_DOC,
        "required": ["task_id", "department", "section", "location", "work_type"],
    }


@router.post("/import", response_model=MaintenanceImportResult)
async def import_requests(file: UploadFile = File(...), db: Session = Depends(get_db)):
    content = await file.read()
    rows = parse_upload(file.filename or "", content)
    if not rows:
        raise HTTPException(status_code=400, detail="No data rows found in file")
    return service.import_requests(db, rows)


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
