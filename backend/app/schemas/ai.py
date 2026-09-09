from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import date, datetime


class CompatibilityRequest(BaseModel):
    task_id: str
    department: str
    section: str
    work_type: str
    duration: float = 2.0
    urgency: str = "normal"
    location: Optional[str] = None


class WindowRequest(BaseModel):
    request_ids: List[str] = []
    section: str
    date: datetime
    max_duration_hours: float = 2.5


class WindowCandidate(BaseModel):
    start: str
    end: str
    affected_trains: int
    priority_affected: int
    conflicts: int
    tsr_required: bool
    estimated_delay: float
    impact_score: float


class RecommendationResponse(BaseModel):
    recommendation: Optional[Dict[str, Any]] = None
    reason: str
    confidence: str = "MEDIUM"
