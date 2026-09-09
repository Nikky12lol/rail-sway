from fastapi import APIRouter, Depends
from typing import List
from datetime import datetime
from sqlalchemy.orm import Session
import json

from app.core.database import get_db
from app.schemas.ai import CompatibilityRequest, WindowRequest, RecommendationResponse
from app.services.ai_service import RailSwayAI
from app.services.maintenance_service import MaintenanceService
from app.services.train_service import TrainService
from app.services.block_service import BlockService
from app.models.decision import DecisionLog

router = APIRouter()
ai_engine = RailSwayAI()
maintenance_service = MaintenanceService()
train_service = TrainService()
block_service = BlockService()


@router.post("/compatibility")
def analyze_compatibility(requests: List[CompatibilityRequest]):
    return ai_engine.analyze_compatibility(requests)


@router.post("/windows")
async def find_windows(request: WindowRequest, db: Session = Depends(get_db)):
    # Resolve maintenance requests: DB first, fall back to echo of ids
    db_reqs = maintenance_service.get_by_task_ids(db, request.request_ids)
    if db_reqs:
        req_dicts = [
            {"task_id": r.task_id, "department": r.department, "section": r.section,
             "work_type": r.work_type, "duration": r.duration, "urgency": r.urgency,
             "location": r.location, "block_required": r.block_required}
            for r in db_reqs
        ]
    else:
        req_dicts = [{"task_id": tid, "department": "ENG", "section": request.section,
                      "work_type": "inspection", "duration": 2.0, "urgency": "normal"} for tid in request.request_ids]
    trains = await train_service.get_for_section(db, request.section, request.date)
    windows = ai_engine.find_optimal_windows(req_dicts, trains, request.date, request.max_duration_hours)

    # Persist candidates so impact-analysis page has stable ids
    saved = []
    for w in windows:
        obj = block_service.create_from_candidate(db, request.section, w, maintenance_ids=request.request_ids)
        saved.append({"id": obj.id, **w})
    return {"windows": saved}


@router.post("/recommend", response_model=RecommendationResponse)
def get_recommendation(windows: List[dict]):
    return ai_engine.generate_recommendation(windows)


@router.post("/full-plan")
async def full_plan(request: WindowRequest, db: Session = Depends(get_db)):
    """One-shot: compatibility + windows + recommendation + decision log."""
    db_reqs = maintenance_service.get_by_task_ids(db, request.request_ids)
    req_dicts = (
        [{"task_id": r.task_id, "department": r.department, "section": r.section,
          "work_type": r.work_type, "duration": r.duration, "urgency": r.urgency} for r in db_reqs]
        if db_reqs else
        [{"task_id": tid, "department": "ENG", "section": request.section,
          "work_type": "inspection", "duration": 2.0, "urgency": "normal"} for tid in request.request_ids]
    )
    compat = ai_engine.analyze_compatibility(req_dicts)
    trains = await train_service.get_for_section(db, request.section, request.date)
    windows = ai_engine.find_optimal_windows(req_dicts, trains, request.date, request.max_duration_hours)
    rec = ai_engine.generate_recommendation(windows)

    saved = []
    for w in windows:
        obj = block_service.create_from_candidate(db, request.section, w, maintenance_ids=request.request_ids)
        saved.append({"id": obj.id, **w})

    log = DecisionLog(
        tasks=json.dumps(request.request_ids),
        candidates=json.dumps(saved, default=str),
        recommended=str((rec.get("recommendation") or {}).get("start", "")),
        reason=rec.get("reason", ""),
        controller_decision="pending",
        status="recommended",
    )
    db.add(log)
    db.commit()

    return {"compatibility": compat, "windows": saved, "recommendation": rec}
