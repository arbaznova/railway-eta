"""
Event Normalizer & Order Validator.

Implements:
1. Rejection of duplicate events.
2. Rejection of stale / out-of-order events.
3. Event schema normalization into internal OperationalEvent records.
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, Tuple
from sqlalchemy.orm import Session

from models.database import OperationalEvent, TrainState


def normalize_and_store_event(
    db: Session,
    event_type: str,
    section_id: str,
    severity: float,
    source: str = "OPERATOR_INJECTION",
    event_id: Optional[str] = None
) -> Tuple[bool, str, Optional[OperationalEvent]]:
    """
    Validates, normalizes, and stores operational events.
    Rejects duplicate and invalid events.
    """
    clean_type = event_type.upper().strip()
    if clean_type not in ["WEATHER", "TSR", "CONGESTION"]:
        return False, f"Invalid event_type: {event_type}. Must be WEATHER, TSR, or CONGESTION.", None

    clean_severity = max(0.0, min(1.0, float(severity)))
    clean_id = event_id or f"EVT_{clean_type}_{uuid.uuid4().hex[:8].upper()}"

    # Check duplicate event ID
    existing = db.query(OperationalEvent).filter_by(event_id=clean_id).first()
    if existing:
        return False, f"Duplicate event_id: {clean_id} rejected.", existing

    # Check for identical active event on section
    dup_active = db.query(OperationalEvent).filter(
        OperationalEvent.section_id == section_id,
        OperationalEvent.event_type == clean_type,
        OperationalEvent.status == "ACTIVE"
    ).first()
    if dup_active:
        # Update severity if newer
        dup_active.severity = clean_severity
        dup_active.source = source
        db.commit()
        return True, f"Updated existing active event {dup_active.event_id} severity to {clean_severity}", dup_active

    event = OperationalEvent(
        event_id=clean_id,
        event_type=clean_type,
        section_id=section_id,
        severity=clean_severity,
        source=source,
        status="ACTIVE",
        start_time=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc)
    )
    db.add(event)
    db.commit()
    db.refresh(event)

    return True, "Operational event registered successfully", event


def validate_train_state_order(
    db: Session,
    train_number: str,
    sequence_number: int,
    timestamp: datetime
) -> bool:
    """
    Rejects stale or out-of-order train telemetry updates.
    Returns True if update is accepted, False if rejected.
    """
    current_state = db.query(TrainState).filter_by(train_number=train_number).first()
    if not current_state:
        return True

    # Sequence number must be strictly greater than current
    if sequence_number <= current_state.sequence_number:
        return False

    # Timestamp must not be earlier than current state last_updated
    if current_state.last_updated and timestamp < current_state.last_updated:
        return False

    return True
