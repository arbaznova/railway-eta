"""
End-to-end integration and verification test suite for the Dynamic Railway ETA backend.
"""

import sys
from pathlib import Path

# Add project root to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from fastapi.testclient import TestClient
from app.main import app
from models.database import init_db, SessionLocal, Train, TrainState, OperationalEvent, ActualArrivalRecord
from services.baseline import calculate_baseline_section_time
from services.feature_builder import build_section_features
from services.predictor import get_predictor
from services.propagation import propagate_train_eta
from services.simulator import simulator
from services.metrics import calculate_accuracy_metrics

def run_tests():
    print("==================================================")
    print("RUNNING RAILWAY ETA BACKEND VERIFICATION TEST")
    print("==================================================")

    # 1. Initialize DB
    init_db()
    db = SessionLocal()

    # Verify seed counts
    train_count = db.query(Train).count()
    print(f"[TEST 1] Master Trains in DB: {train_count}")
    assert train_count == 8, f"Expected 8 demo trains, found {train_count}"

    # 2. Test Rule-Based Baseline Engine
    print("\n[TEST 2] Testing Deterministic Baseline Engine...")
    sched_mins = 42.0
    base_clear, b_info = calculate_baseline_section_time(
        scheduled_section_minutes=sched_mins,
        weather_severity=0.0,
        tsr_severity=0.0,
        congestion_level=0.0
    )
    print(f"  Clear conditions baseline: {base_clear}m (scheduled: {sched_mins}m)")
    assert base_clear == sched_mins, "Clear baseline should match scheduled minutes"

    base_disrupt, b_info_disrupt = calculate_baseline_section_time(
        scheduled_section_minutes=sched_mins,
        weather_severity=0.6,
        tsr_severity=0.8,
        congestion_level=0.5,
        trains_ahead=2
    )
    print(f"  Disrupted conditions baseline: {base_disrupt}m (breakdown: {b_info_disrupt})")
    assert base_disrupt > base_clear, "Disrupted baseline should exceed clear baseline"

    # 3. Test Feature Builder
    print("\n[TEST 3] Testing Runtime Feature Builder (19 features)...")
    features = build_section_features(db, "12002", "NDLS_MTJ", "MTJ")
    print(f"  Extracted {len(features)} features:")
    for k, v in features.items():
        print(f"    - {k}: {v}")
    assert len(features) == 20, f"Expected 20 feature keys (19 features + baseline), got {len(features)}"
    assert "geo_distance_km" in features
    assert "baseline_section_minutes" in features

    # 4. Test Predictor Contract
    print("\n[TEST 4] Testing Predictor ML Contract...")
    predictor = get_predictor()
    pred_res = predictor.predict_section(features)
    print(f"  Predictor Output: baseline={pred_res.baseline_section_minutes}m, residual={pred_res.ml_residual_minutes}m, final={pred_res.predicted_section_minutes}m")
    print(f"  Source: {pred_res.prediction_source}, Version: {pred_res.model_version}")
    print(f"  Uncertainty: P10={pred_res.p10}, P50={pred_res.p50}, P90={pred_res.p90}")
    assert pred_res.predicted_section_minutes > 0
    assert pred_res.prediction_source == "ml"
    assert pred_res.model_version == "eta_catboost_v1"
    assert pred_res.p10 is not None and pred_res.p90 is not None
    assert pred_res.p10 <= pred_res.p50 <= pred_res.p90

    # 5. Test ETA Propagation
    print("\n[TEST 5] Testing Station-by-Station ETA Propagation for Train 12002...")
    eta_res = propagate_train_eta(db, "12002")
    print(f"  Train: {eta_res.train_number} ({eta_res.train_name})")
    print(f"  Upcoming Stops count: {len(eta_res.upcoming_stations)}")
    for stop in eta_res.upcoming_stations[:4]:
        print(f"    - Station: {stop.station_name} ({stop.station_code}) | Sched: {stop.scheduled_arrival} | Baseline: {stop.baseline_eta} | Dynamic: {stop.dynamic_eta} | P10: {stop.p10_eta} | P90: {stop.p90_eta}")
    assert len(eta_res.upcoming_stations) > 0

    # 6. Test Operational Disruption Injection & ETA Shift
    print("\n[TEST 6] Testing Event Injection & ETA Shift Response...")
    # Baseline before event
    eta_before = propagate_train_eta(db, "12002")
    first_stop_dyn_before = eta_before.upcoming_stations[1].predicted_delay_minutes

    # Inject TSR event on NDLS_MTJ
    client = TestClient(app)
    inj_resp = client.post("/api/v1/simulation/events", json={
        "event_type": "TSR",
        "section_id": "NDLS_MTJ",
        "severity": 0.8,
        "source": "OPERATOR_INJECTION"
    })
    print(f"  Inject TSR Response Code: {inj_resp.status_code}, data: {inj_resp.json()}")
    assert inj_resp.status_code == 200

    # Re-compute ETA after TSR
    eta_after = propagate_train_eta(db, "12002")
    first_stop_dyn_after = eta_after.upcoming_stations[1].predicted_delay_minutes
    print(f"  Delay before TSR: {first_stop_dyn_before}m -> Delay after TSR: {first_stop_dyn_after}m")
    assert first_stop_dyn_after >= first_stop_dyn_before, "Injected TSR should increase downstream delay"

    # 7. Test Simulator Tick & Ground Truth Recording
    print("\n[TEST 7] Testing Simulator Step & Actual Traversal Recording...")
    # Step simulation by 3000 seconds to complete sections
    tick_res = simulator.tick(db, elapsed_seconds=3600.0)
    print(f"  Simulator ticked. Trains updated: {len(tick_res)}")
    actuals_count = db.query(ActualArrivalRecord).count()
    print(f"  Recorded Ground Truth Actual Arrivals: {actuals_count}")

    # 8. Test Accuracy Metrics
    print("\n[TEST 8] Testing Accuracy Metrics Engine...")
    metrics = calculate_accuracy_metrics(db)
    print(f"  Metrics: Total Completed Sections={metrics.total_completed_sections}")
    print(f"  Baseline MAE={metrics.baseline_mae}m vs Dynamic ML MAE={metrics.dynamic_mae}m")
    print(f"  Improvement: {metrics.improvement_percentage}%")
    assert metrics.baseline_mae >= 0

    # 9. Test API Endpoints via FastAPI TestClient
    print("\n[TEST 9] Testing FastAPI REST Endpoints...")
    endpoints = [
        ("GET", "/health", 200),
        ("GET", "/api/v1/trains", 200),
        ("GET", "/api/v1/trains/12002", 200),
        ("GET", "/api/v1/eta/12002", 200),
        ("GET", "/api/v1/station/AGC/expected-arrivals", 200),
        ("GET", "/api/v1/network/sections", 200),
        ("GET", "/api/v1/alerts", 200),
        ("GET", "/api/v1/metrics/accuracy", 200),
        ("POST", "/api/v1/simulation/tick", 200)
    ]

    for method, path, expected_code in endpoints:
        if method == "GET":
            r = client.get(path)
        else:
            r = client.post(path)
        print(f"  {method} {path} -> HTTP {r.status_code}")
        assert r.status_code == expected_code, f"Failed on {path}: {r.text}"

    print("\n==================================================")
    print("ALL VERIFICATION TESTS PASSED SUCCESSFULLY! (100%)")
    print("==================================================")
    db.close()

if __name__ == "__main__":
    run_tests()
