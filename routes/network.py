"""
Network sections and topology endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.database import get_db, RouteSection, OperationalEvent
from schemas.network import SectionResponse
from schemas.events import OperationalEventResponse

router = APIRouter(prefix="/api/v1/network", tags=["Network"])


@router.get("/sections", response_model=List[SectionResponse])
def get_all_sections(db: Session = Depends(get_db)):
    """Returns all network track sections along with active operational disruptions."""
    sections = db.query(RouteSection).all()
    results = []

    for s in sections:
        events = db.query(OperationalEvent).filter(
            OperationalEvent.section_id == s.section_id,
            OperationalEvent.status == "ACTIVE"
        ).all()

        results.append(SectionResponse(
            section_id=s.section_id,
            from_station=s.from_station,
            to_station=s.to_station,
            geo_distance_km=s.geo_distance_km,
            scheduled_section_minutes=s.scheduled_section_minutes,
            route_context=s.route_context,
            active_events=[OperationalEventResponse.model_validate(e) for e in events]
        ))

    return results


@router.get("/sections/{section_id}", response_model=SectionResponse)
def get_section_by_id(section_id: str, db: Session = Depends(get_db)):
    """Returns details and active operational events for a specific section."""
    sec = db.query(RouteSection).filter_by(section_id=section_id).first()
    if not sec:
        raise HTTPException(status_code=404, detail=f"Section {section_id} not found")

    events = db.query(OperationalEvent).filter(
        OperationalEvent.section_id == sec.section_id,
        OperationalEvent.status == "ACTIVE"
    ).all()

    return SectionResponse(
        section_id=sec.section_id,
        from_station=sec.from_station,
        to_station=sec.to_station,
        geo_distance_km=sec.geo_distance_km,
        scheduled_section_minutes=sec.scheduled_section_minutes,
        route_context=sec.route_context,
        active_events=[OperationalEventResponse.model_validate(e) for e in events]
    )
