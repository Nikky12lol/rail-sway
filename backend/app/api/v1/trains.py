from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from datetime import date
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.train import TrainCreate, TrainOut
from app.models.train import Train
from app.services.train_service import TrainService

router = APIRouter()
service = TrainService()


@router.get("", response_model=List[TrainOut])
def list_trains(section: Optional[str] = Query(None), skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    return service.list(db, section=section, skip=skip, limit=limit)


@router.post("", response_model=TrainOut, status_code=201)
def create_train(payload: TrainCreate, db: Session = Depends(get_db)):
    obj = Train(**payload.model_dump())
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
    from datetime import datetime
    d = day or date.today()
    trains = await service.get_for_section(db, section, datetime(d.year, d.month, d.day))
    # serialise datetimes
    out = []
    for t in trains:
        st = t.get("scheduled_time")
        out.append({**t, "scheduled_time": st.isoformat() if hasattr(st, "isoformat") else st})
    return {"section": section, "date": d.isoformat(), "count": len(out), "trains": out}
