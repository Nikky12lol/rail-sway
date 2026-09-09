from fastapi import APIRouter, Depends, Query
from typing import Optional, List
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.block import BlockOut, BlockDecision
from app.services.block_service import BlockService

router = APIRouter()
service = BlockService()


@router.get("", response_model=List[BlockOut])
def list_blocks(section: Optional[str] = Query(None), status: Optional[str] = Query(None),
                limit: int = 100, db: Session = Depends(get_db)):
    return service.list(db, section=section, status=status, limit=limit)


@router.get("/{window_id}", response_model=BlockOut)
def get_block(window_id: int, db: Session = Depends(get_db)):
    return service.get(db, window_id)


@router.post("/{window_id}/decision", response_model=BlockOut)
def decide_block(window_id: int, payload: BlockDecision, db: Session = Depends(get_db)):
    # user optional for demo; pass None
    return service.decide(db, window_id, payload.decision, user_id=None)
