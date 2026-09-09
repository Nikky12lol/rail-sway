from sqlalchemy import Column, Integer, String, DateTime, Text
from app.core.database import Base
from datetime import datetime


class DecisionLog(Base):
    __tablename__ = "decision_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    tasks = Column(Text, nullable=True)  # JSON list of task_ids
    candidates = Column(Text, nullable=True)  # JSON of candidate windows
    recommended = Column(String(50), nullable=True)
    reason = Column(Text, nullable=True)
    controller_decision = Column(String(20), nullable=True)  # approved|rejected|modified
    status = Column(String(20), default="logged")
    user_id = Column(Integer, nullable=True)
