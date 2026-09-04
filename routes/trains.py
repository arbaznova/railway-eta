"""
Train information and state endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.database import get_db, Train, TrainState, TrainSchedule, Station
from schemas.train import TrainSummary, TrainDetail, ScheduleStop

router = APIRouter(prefix="/api/v1/trains", tags=["Trains"])


@router.get("", response_model=List[TrainSummary])
def get_active_trains(db: Session = Depends(get_db)):
    """Returns all active trains and their live state summary."""
    trains = db.query(Train).order_by(Train.train_number.asc()).all()
    results = []

    for t in trains:
        state = db.query(TrainState).filter_by(train_number=t.train_number).first()
        if not state:
            continue
        results.append(TrainSummary(
            train_number=t.train_number,
            train_name=t.train_name,
            train_type=t.train_type,
            zone=t.zone,
            origin=t.origin,
            destination=t.destination,
            current_station_code=state.current_station_code,
            next_station_code=state.next_station_code,
            current_section_id=state.current_section_id,
            progress_ratio=state.progress_ratio,
            position_km=state.position_km,
            current_delay_minutes=state.current_delay_minutes,
            speed_kmh=state.speed_kmh,
            status=state.status,
            last_updated=state.last_updated
        ))

    return results


@router.get("/{train_id}", response_model=TrainDetail)
def get_train_detail(train_id: str, db: Session = Depends(get_db)):
    """Returns complete route schedule and live state for a specific train."""
    train = db.query(Train).filter_by(train_number=train_id).first()
    if not train:
        raise HTTPException(status_code=404, detail=f"Train {train_id} not found")

    state = db.query(TrainState).filter_by(train_number=train_id).first()
    if not state:
        raise HTTPException(status_code=404, detail=f"State for train {train_id} not found")

    scheds = db.query(TrainSchedule).filter_by(train_number=train_id).order_by(TrainSchedule.station_sequence).all()
    stations_dict = {s.station_code: s.station_name for s in db.query(Station).all()}

    stops = [
        ScheduleStop(
            station_code=s.station_code,
            station_name=stations_dict.get(s.station_code, s.station_code),
            station_sequence=s.station_sequence,
            scheduled_arrival=s.scheduled_arrival,
            scheduled_departure=s.scheduled_departure,
            day_number=s.day_number
        )
        for s in scheds
    ]

    summary = TrainSummary(
        train_number=train.train_number,
        train_name=train.train_name,
        train_type=train.train_type,
        zone=train.zone,
        origin=train.origin,
        destination=train.destination,
        current_station_code=state.current_station_code,
        next_station_code=state.next_station_code,
        current_section_id=state.current_section_id,
        progress_ratio=state.progress_ratio,
        position_km=state.position_km,
        current_delay_minutes=state.current_delay_minutes,
        speed_kmh=state.speed_kmh,
        status=state.status,
        last_updated=state.last_updated
    )

    return TrainDetail(
        train_number=train.train_number,
        train_name=train.train_name,
        train_type=train.train_type,
        zone=train.zone,
        origin=train.origin,
        destination=train.destination,
        route_corridor=train.route_corridor,
        current_state=summary,
        stops=stops
    )
