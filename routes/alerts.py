"""
Operational alerts routes.
"""

from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from models.database import get_db, AlertRecord
from schemas.alerts import AlertResponse

router = APIRouter(prefix="/api/v1/alerts", tags=["Alerts"])


@router.get("", response_model=List[AlertResponse])
def get_active_alerts(db: Session = Depends(get_db)):
    """Returns active operational advisory and delay cascade alerts."""
    alerts = db.query(AlertRecord).filter_by(is_resolved=False).order_by(AlertRecord.created_at.desc()).all()
    return [AlertResponse.model_validate(a) for a in alerts]
