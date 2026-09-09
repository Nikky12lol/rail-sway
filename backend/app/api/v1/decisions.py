from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.core.database import get_db
from app.models.decision import DecisionLog

router = APIRouter()


class DecisionOut(BaseModel):
    id: int
    timestamp: datetime
    tasks: Optional[str] = None
    candidates: Optional[str] = None
    recommended: Optional[str] = None
    reason: Optional[str] = None
    controller_decision: Optional[str] = None
    status: Optional[str] = None
    user_id: Optional[int] = None
    comparison: Optional[str] = None

    class Config:
        from_attributes = True


@router.get("", response_model=List[DecisionOut])
def list_decisions(limit: int = 100, db: Session = Depends(get_db)):
    return db.query(DecisionLog).order_by(DecisionLog.timestamp.desc()).limit(limit).all()


@router.get("/{decision_id}", response_model=DecisionOut)
def get_decision(decision_id: int, db: Session = Depends(get_db)):
    obj = db.query(DecisionLog).filter(DecisionLog.id == decision_id).first()
    if not obj:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Decision not found")
    return obj
