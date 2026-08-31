"""
Operational Event Schemas.
"""

from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class OperationalEventCreate(BaseModel):
    event_type: str = Field(..., description="WEATHER, TSR, or CONGESTION")
    section_id: str = Field(..., description="Target section ID e.g. NDLS_MTJ")
    severity: float = Field(default=0.5, ge=0.0, le=1.0, description="Severity between 0.0 and 1.0")
    source: Optional[str] = "OPERATOR_INJECTION"


class OperationalEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: str
    event_type: str
    section_id: str
    severity: float
    status: str
    source: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    created_at: Optional[datetime] = None
