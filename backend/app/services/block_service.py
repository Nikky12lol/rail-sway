from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException
import json
from app.models.block import BlockWindow
from app.models.decision import DecisionLog
from app.models.maintenance import MaintenanceRequest, MaintenanceStatus


class BlockService:
    def list(self, db: Session, section: Optional[str] = None, status: Optional[str] = None, limit: int = 100) -> List[BlockWindow]:
        q = db.query(BlockWindow)
        if section:
            q = q.filter(BlockWindow.section == section)
        if status:
            q = q.filter(BlockWindow.status == status)
        return q.order_by(BlockWindow.start_time.desc()).limit(limit).all()

    def get(self, db: Session, window_id: int) -> BlockWindow:
        obj = db.query(BlockWindow).filter(BlockWindow.id == window_id).first()
        if not obj:
            raise HTTPException(status_code=404, detail="Block window not found")
        return obj

    def create_from_candidate(self, db: Session, section: str, candidate: dict, maintenance_ids: Optional[list] = None) -> BlockWindow:
        obj = BlockWindow(
            section=section,
            start_time=datetime.fromisoformat(candidate["start"]),
            end_time=datetime.fromisoformat(candidate["end"]),
            maintenance_ids=",".join(maintenance_ids or []),
            impact_score=candidate.get("impact_score", 0),
            affected_trains=candidate.get("affected_trains", 0),
            priority_trains_affected=candidate.get("priority_affected", 0),
            conflicts=candidate.get("conflicts", 0),
            tsr_required=candidate.get("tsr_required", False),
            estimated_delay=candidate.get("estimated_delay", 0),
            status="candidate",
        )
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def decide(self, db: Session, window_id: int, decision: str, user_id: Optional[int] = None, reason: Optional[str] = None) -> BlockWindow:
        if decision not in ("approved", "rejected"):
            raise HTTPException(status_code=400, detail="decision must be approved|rejected")
        obj = self.get(db, window_id)
        if obj.controller_decision in ("approved", "rejected"):
            raise HTTPException(
                status_code=409,
                detail=f"Block already {obj.controller_decision}; duplicate decisions are not recorded",
            )
        obj.controller_decision = decision
        obj.status = decision
        obj.approved_by = user_id
        obj.approved_at = datetime.utcnow()
        if reason:
            obj.recommendation_reason = reason
        # cascade status onto linked maintenance requests
        tids: List[str] = []
        if obj.maintenance_ids:
            tids = [t.strip() for t in obj.maintenance_ids.split(",") if t.strip()]
            if tids:
                new_status = MaintenanceStatus.SCHEDULED if decision == "approved" else MaintenanceStatus.REJECTED
                db.query(MaintenanceRequest).filter(MaintenanceRequest.task_id.in_(tids)).update(
                    {"status": new_status, "scheduled_window_id": obj.id if decision == "approved" else None},
                    synchronize_session=False,
                )
        # audit the human decision so approve AND reject paths are traceable
        db.add(
            DecisionLog(
                tasks=json.dumps(tids),
                candidates=json.dumps([{
                    "section": obj.section,
                    "start": obj.start_time.isoformat() if obj.start_time else "",
                    "end": obj.end_time.isoformat() if obj.end_time else "",
                    "impact_score": obj.impact_score,
                    "affected_trains": obj.affected_trains,
                }]),
                recommended=obj.start_time.isoformat() if obj.start_time else "",
                reason=reason or obj.recommendation_reason,
                controller_decision=decision,
                status=decision,
                user_id=user_id,
            )
        )
        db.commit()
        db.refresh(obj)
        return obj
