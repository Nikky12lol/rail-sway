"""Non-secret system status for the Settings page and demo diagnostics."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.config import settings
from app.core.database import get_db, engine
from app.models.maintenance import MaintenanceRequest
from app.models.train import Train
from app.models.block import BlockWindow
from app.models.decision import DecisionLog

router = APIRouter()


@router.get("/status")
def system_status(db: Session = Depends(get_db)):
    dialect = engine.dialect.name if engine else "unknown"
    return {
        "service": "Rail-Sway API",
        "version": "2.0.0",
        "timetable": {
            "external_configured": bool(settings.IR_API_BASE_URL),
            "note": "External feed" if settings.IR_API_BASE_URL else "Demo/seed/uploaded data (no IR feed configured)",
        },
        "ai": {
            "engine": "RailSwayAI (compatibility + window search + RF impact scoring)",
            "gemini_configured": bool(settings.GEMINI_API_KEY),
            "openai_configured": bool(settings.OPENAI_API_KEY),
        },
        "database": {
            "dialect": dialect,
            "maintenance_requests": db.query(func.count(MaintenanceRequest.id)).scalar(),
            "trains": db.query(func.count(Train.id)).scalar(),
            "block_windows": db.query(func.count(BlockWindow.id)).scalar(),
            "decision_logs": db.query(func.count(DecisionLog.id)).scalar(),
        },
    }
