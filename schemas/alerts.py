"""
Alert Schemas.
"""

from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    alert_id: str
    alert_type: str
    severity: str
    reason: str
    source_train: Optional[str] = None
    source_section: Optional[str] = None
    affected_trains: Optional[str] = None
    estimated_impact: Optional[str] = None
    created_at: Optional[datetime] = None
    is_resolved: bool = False
