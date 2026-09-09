from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class BlockBase(BaseModel):
    section: str
    start_time: datetime
    end_time: datetime
    maintenance_ids: Optional[str] = None
    impact_score: float = 0.0
    affected_trains: int = 0
    priority_trains_affected: int = 0
    conflicts: int = 0
    tsr_required: bool = False
    estimated_delay: float = 0.0
    status: str = "candidate"
    recommendation_reason: Optional[str] = None


class BlockCreate(BlockBase):
    pass


class BlockDecision(BaseModel):
    decision: str  # approved|rejected
    maintenance_ids: Optional[List[str]] = None


class BlockOut(BlockBase):
    id: int
    controller_decision: Optional[str] = None
    approved_by: Optional[int] = None
    approved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
