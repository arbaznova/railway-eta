"""
Deterministic Rule-Based Baseline Engine.

Implements the baseline section traversal time formula from agent.md:
baseline_section_time =
    scheduled_section_time
    + weather_penalty
    + tsr_penalty
    + congestion_penalty
    + trains_ahead_penalty
    - bounded_recovery_allowance

The ML model predicts:

    residual = actual_section_time - baseline_section_time

Final prediction:

    baseline_section_time + predicted_residual

CRITICAL RULE:
Current accumulated delay must NOT simply be added to the next section's running time.
A train being 30 minutes late does not mean a 6-minute section will take 36 minutes.
"""

from typing import Dict, Tuple


def calculate_baseline_section_time(
    scheduled_section_minutes: float,
    weather_severity: float = 0.0,
    tsr_severity: float = 0.0,
    congestion_level: float = 0.0,
    trains_ahead: int = 0,
    current_delay_minutes: float = 0.0
) -> Tuple[float, Dict[str, float]]:
    """
    Calculate deterministic baseline traversal time with individual penalty breakdowns.
    """
    # 1. Weather penalty (up to 25% of section time at severity 1.0)
    # weather_penalty = max(0.0, weather_severity) * 0.25 * scheduled_section_minutes
    weather_penalty = (scheduled_section_minutes* 0.20* max(0.0, weather_severity))

    # 2. TSR penalty (up to 40% of section time at severity 1.0)
    # tsr_penalty = max(0.0, tsr_severity) * 0.40 * scheduled_section_minutes
    tsr_penalty = (scheduled_section_minutes* 0.35* max(0.0, tsr_severity))

    # 3. Congestion penalty (up to 30% of section time at severity 1.0)
    # congestion_penalty = max(0.0, congestion_level) * 0.30 * scheduled_section_minutes
    congestion_penalty = (scheduled_section_minutes* 0.25* max(0.0, congestion_level))

    # 4. Trains ahead penalty (each train ahead adds up to 1.5 min, capped at 35% section time)
    # trains_ahead_penalty = min(max(0, trains_ahead) * 1.5,0.35 * scheduled_section_minutes )
    trains_ahead_penalty = (min(max(0, trains_ahead), 5) * 0.20)

    # 5. Bounded recovery allowance
    # A delayed train running under mild conditions can make up a small bounded portion of time
    # bounded_recovery = 0.0
    # if current_delay_minutes > 0 and weather_severity < 0.2 and tsr_severity < 0.1 and congestion_level < 0.2:
    #     max_rec = min(
    #         current_delay_minutes * 0.10,
    #         scheduled_section_minutes * 0.08,
    #         4.0  # Max 4 mins recovery per section
    #     )
    #     bounded_recovery = max(0.0, max_rec)
    bounded_recovery = min(
    max(0.0, current_delay_minutes) * 0.025,
    scheduled_section_minutes * 0.12
    )

    raw_baseline = (
        scheduled_section_minutes
        + weather_penalty
        + tsr_penalty
        + congestion_penalty
        + trains_ahead_penalty
        - bounded_recovery
    )

    # Physical lower bound: a train cannot run faster than ~70% of schedule under standard MPS
    baseline_time = max(scheduled_section_minutes * 0.70,1.0, round(raw_baseline, 2))

    breakdown = {
        "scheduled_section_minutes": round(scheduled_section_minutes, 2),
        "weather_penalty": round(weather_penalty, 2),
        "tsr_penalty": round(tsr_penalty, 2),
        "congestion_penalty": round(congestion_penalty, 2),
        "trains_ahead_penalty": round(trains_ahead_penalty, 2),
        "bounded_recovery": round(bounded_recovery, 2),
        "baseline_minutes": round(baseline_time, 2)
    }

    return baseline_time, breakdown
