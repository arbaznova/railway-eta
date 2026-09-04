"""
Simulation control and event injection routes.
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from models.database import get_db, OperationalEvent, TrainState, TrainSchedule, ActualArrivalRecord, AlertRecord
from schemas.events import OperationalEventCreate, OperationalEventResponse
from services.event_normalizer import normalize_and_store_event
from services.simulator import simulator

router = APIRouter(prefix="/api/v1/simulation", tags=["Simulation"])


@router.post("/events", response_model=OperationalEventResponse)
def inject_operational_event(event_in: OperationalEventCreate, db: Session = Depends(get_db)):
    """
    Injects a simulated operational event (WEATHER, TSR, CONGESTION) onto a section.
    Causes section predictions to dynamically update and downstream station ETAs to shift.
    """
    success, msg, event = normalize_and_store_event(
        db=db,
        event_type=event_in.event_type,
        section_id=event_in.section_id,
        severity=event_in.severity,
        source=event_in.source or "OPERATOR_INJECTION"
    )

    if not success or not event:
        raise HTTPException(status_code=400, detail=msg)

    return OperationalEventResponse.model_validate(event)


@router.get("/status")
def get_simulation_status():
    """Returns the current operational status of the background simulation runner."""
    return {
        "is_running": simulator.is_running,
        "is_paused": simulator.is_paused,
        "tick_interval_seconds": simulator.tick_interval_seconds,
        "sim_speed_factor": simulator.sim_speed_factor
    }


@router.post("/pause")
def pause_simulation():
    """Pauses automatic background simulation ticking."""
    simulator.pause()
    return {"status": "ok", "is_paused": True, "message": "Simulation auto-run paused."}


@router.post("/resume")
def resume_simulation():
    """Resumes automatic background simulation ticking."""
    simulator.resume()
    return {"status": "ok", "is_paused": False, "message": "Simulation auto-run active."}


@router.post("/tick")
def step_simulation(seconds: float = 60.0, db: Session = Depends(get_db)):
    """
    Manually steps the simulation clock forward by `seconds`.
    Moves trains, updates progress, and produces actual arrival records on section completions.
    """
    updates = simulator.tick(db, elapsed_seconds=seconds)
    return {"status": "ok", "seconds_elapsed": seconds, "trains_updated": len(updates), "updates": updates}


@router.post("/reset")
def reset_simulation(db: Session = Depends(get_db)):
    """
    Resets all trains back to origin with 0 delay and clears all active disruptions.
    """
    # 1. Pause auto-run
    simulator.pause()

    # 2. Clear active operational events
    db.query(OperationalEvent).delete()
    db.query(AlertRecord).delete()

    # 2. Reset train positions
    states = db.query(TrainState).all()
    for state in states:
        scheds = db.query(TrainSchedule).filter_by(train_number=state.train_number).order_by(TrainSchedule.station_sequence).all()
        if len(scheds) >= 2:
            first_st = scheds[0].station_code
            second_st = scheds[1].station_code
            state.current_station_code = first_st
            state.next_station_code = second_st
            state.current_section_id = f"{first_st}_{second_st}"
            state.progress_ratio = 0.05
            state.position_km = 5.0
            state.current_delay_minutes = 0.0
            state.previous_section_delay_minutes = 0.0
            state.rolling_delay_3_sections = 0.0
            state.speed_kmh = 90.0
            state.status = "RUNNING"

    db.commit()
    return {"status": "ok", "message": "Simulation state and operational events reset successfully."}
