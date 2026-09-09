from fastapi import APIRouter, Depends, Query, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from typing import Optional, List
from datetime import date, datetime
from sqlalchemy.orm import Session
import csv
import io
from app.core.database import get_db
from app.schemas.train import TrainCreate, TrainOut, TrainImportResult
from app.models.train import Train
from app.services.train_service import TrainService, IMPORT_COLUMNS_DOC
from app.services.ir_integration import mock_schedule_for_section
from app.utils.file_import import parse_upload

router = APIRouter()
service = TrainService()


@router.get("", response_model=List[TrainOut])
def list_trains(section: Optional[str] = Query(None), skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    return service.list(db, section=section, skip=skip, limit=limit)


@router.post("", response_model=TrainOut, status_code=201)
def create_train(payload: TrainCreate, db: Session = Depends(get_db)):
    obj = Train(**payload.model_dump(), source="manual")
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/seed")
def seed(section: str = "Bhadrak–Jajpur", db: Session = Depends(get_db)):
    n = service.seed_if_empty(db, section=section)
    return {"seeded": n}


@router.get("/live")
async def live_trains(section: str = "Bhadrak–Jajpur", day: Optional[date] = None, db: Session = Depends(get_db)):
    d = day or date.today()
    trains = await service.get_for_section(db, section, datetime(d.year, d.month, d.day))
    # serialise datetimes
    out = []
    for t in trains:
        st = t.get("scheduled_time")
        out.append({**t, "scheduled_time": st.isoformat() if hasattr(st, "isoformat") else st})
    return {"section": section, "date": d.isoformat(), "count": len(out), "trains": out}


@router.get("/columns")
def import_columns():
    """Document the expected timetable file format for the upload UI."""
    return {
        "formats": ["csv", "xlsx"],
        "columns": IMPORT_COLUMNS_DOC,
        "required": ["train_number", "train_name", "scheduled_time"],
        "direction_note": "Direction is derived as origin → destination.",
    }


@router.get("/sample")
def sample_csv(day: Optional[date] = None, section: str = "Bhadrak–Jajpur"):
    """Generate a ready-to-upload sample timetable for the given date (default today)."""
    d = day or date.today()
    rows = mock_schedule_for_section(section, d)
    buf = io.StringIO()
    writer = csv.DictWriter(
        buf,
        fieldnames=["train_number", "train_name", "train_type", "priority", "section",
                    "origin", "destination", "scheduled_time", "status"],
    )
    writer.writeheader()
    for m in rows:
        writer.writerow({
            "train_number": m["train_number"],
            "train_name": m["train_name"],
            "train_type": m["train_type"],
            "priority": m["priority"],
            "section": m["section"],
            "origin": m["origin"],
            "destination": m["destination"],
            "scheduled_time": m["scheduled_time"].isoformat(timespec="minutes"),
            "status": m["status"],
        })
    buf.seek(0)
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=rail-sway-sample-timetable-{d.isoformat()}.csv"},
    )


@router.post("/import", response_model=TrainImportResult)
async def import_timetable(file: UploadFile = File(...), replace: bool = Query(False, description="Delete previously uploaded rows for this section/date before importing"),
                           section: Optional[str] = Query(None), day: Optional[date] = Query(None),
                           db: Session = Depends(get_db)):
    content = await file.read()
    rows = parse_upload(file.filename or "", content)
    if not rows:
        raise HTTPException(status_code=400, detail="No data rows found in file")
    cleared = service.clear_uploaded(db, section=section, day=day) if replace else 0
    stats = service.import_timetable(db, rows)
    return {**stats, "cleared": cleared}
