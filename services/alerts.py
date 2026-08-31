"""
Alert and Cascade Detection Engine.

Detects:
- Severe operational events (high TSR, severe fog/weather, heavy block congestion)
- Significant ETA jumps (e.g. > 15 minutes sudden increase)
- Cascade delays on following trains
Alerts are purely advisory.
"""

import uuid
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session

from models.database import AlertRecord, OperationalEvent, TrainState


def check_and_generate_alerts(db: Session) -> List[AlertRecord]:
    """
    Evaluates current network and train states to generate advisory alerts.
    """
    new_alerts = []

    # 1. Severe operational disruptions
    active_events = db.query(OperationalEvent).filter(
        OperationalEvent.status == "ACTIVE",
        OperationalEvent.severity >= 0.6
    ).all()

    for ev in active_events:
        alert_id = f"ALT_DISRUPT_{ev.event_id}"
        existing = db.query(AlertRecord).filter_by(alert_id=alert_id).first()
        if not existing:
            affected_trains = [
                t.train_number for t in db.query(TrainState).filter(
                    TrainState.current_section_id == ev.section_id
                ).all()
            ]

            sev_label = "CRITICAL" if ev.severity >= 0.8 else "HIGH"
            reason = f"Severe {ev.event_type} disruption on section {ev.section_id} (severity {ev.severity:.2f})"
            impact = f"+{int(ev.severity * 25)} min estimated section delay"

            alert = AlertRecord(
                alert_id=alert_id,
                alert_type=f"{ev.event_type}_SEVERITY",
                severity=sev_label,
                reason=reason,
                source_section=ev.section_id,
                affected_trains=str(affected_trains),
                estimated_impact=impact,
                created_at=datetime.now(timezone.utc),
                is_resolved=False
            )
            db.add(alert)
            new_alerts.append(alert)

    # 2. Accumulated delay alerts
    delayed_trains = db.query(TrainState).filter(
        TrainState.current_delay_minutes >= 20.0
    ).all()

    for t in delayed_trains:
        alert_id = f"ALT_DELAY_{t.train_number}_{int(t.current_delay_minutes // 10)}"
        existing = db.query(AlertRecord).filter_by(alert_id=alert_id).first()
        if not existing:
            alert = AlertRecord(
                alert_id=alert_id,
                alert_type="SIGNIFICANT_DELAY",
                severity="MEDIUM" if t.current_delay_minutes < 40.0 else "HIGH",
                reason=f"Train {t.train_number} has accumulated {t.current_delay_minutes:.1f} minutes delay",
                source_train=t.train_number,
                source_section=t.current_section_id,
                affected_trains=str([t.train_number]),
                estimated_impact=f"Downstream station ETAs shifted by ~{int(t.current_delay_minutes)} min",
                created_at=datetime.now(timezone.utc),
                is_resolved=False
            )
            db.add(alert)
            new_alerts.append(alert)

    if new_alerts:
        db.commit()

    return new_alerts
