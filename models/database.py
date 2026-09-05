"""
Database models and persistence setup for Dynamic Railway ETA Prediction backend.
Supports SQLite (default) and PostgreSQL with SQLAlchemy.
"""

import os
import json
import csv
import urllib.parse
from datetime import datetime, timezone
from pathlib import Path
from typing import Generator

from sqlalchemy import (
    create_engine, Column, String, Float, Integer, DateTime, Boolean, Text, ForeignKey, Index
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# Automatically load environment variables from .env if present
try:
    from dotenv import load_dotenv
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    env_file = BASE_DIR / ".env"
    if env_file.exists():
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k, v = k.strip(), v.strip().strip("'\"")
                    if k and k not in os.environ:
                        os.environ[k] = v

def clean_database_url(url: str) -> str:
    """
    Sanitize and normalize DATABASE_URL for SQLAlchemy:
    - Strips whitespace, newlines, and surrounding quotes.
    - Replaces postgres:// with postgresql://.
    - Automatically URL-encodes special characters in password (e.g. @, #) if needed.
    """
    if not url:
        return url
    url = url.strip().strip("'\"")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)

    if url.startswith("sqlite"):
        return url

    # Test if SQLAlchemy can parse it as-is
    try:
        from sqlalchemy.engine import make_url
        make_url(url)
        return url
    except Exception:
        pass

    # If parsing failed, handle unencoded special characters in password:
    # URL format: driver://username:password@host:port/database
    if "://" in url and "@" in url:
        try:
            scheme, rest = url.split("://", 1)
            last_at_idx = rest.rfind("@")
            if last_at_idx != -1:
                creds = rest[:last_at_idx]
                host_path = rest[last_at_idx + 1:]
                if ":" in creds:
                    user, raw_pass = creds.split(":", 1)
                    # Unquote first to prevent double-encoding, then percent-encode
                    unquoted = urllib.parse.unquote(raw_pass)
                    encoded_pass = urllib.parse.quote_plus(unquoted)
                    fixed_url = f"{scheme}://{user}:{encoded_pass}@{host_path}"
                    return fixed_url
        except Exception:
            pass

    return url


DATABASE_URL = clean_database_url(os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'rail_eda.db'}"))

# If using Supabase connection pooler, use port 6543 (Transaction mode)
# and NullPool to prevent (EMAXCONNSESSION) 15-client limit exhaustion
if "pooler.supabase.com" in DATABASE_URL:
    if ":5432/" in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace(":5432/", ":6543/")

# Connection args and pooling configuration
connect_args = {}
engine_kwargs = {"echo": False}

if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False
elif "pooler.supabase.com" in DATABASE_URL:
    from sqlalchemy.pool import NullPool
    engine_kwargs["poolclass"] = NullPool
    engine_kwargs["pool_pre_ping"] = True
else:
    # Managed PostgreSQL (Direct / Render) pool tuning
    engine_kwargs.update({
        "pool_size": 5,
        "max_overflow": 5,
        "pool_pre_ping": True,
        "pool_recycle": 300,
    })

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    **engine_kwargs
)

# Enable WAL mode for SQLite
if DATABASE_URL.startswith("sqlite"):
    from sqlalchemy import event
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency for FastAPI routes
def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ----------------- Tables -----------------

class Station(Base):
    __tablename__ = "stations"

    station_code = Column(String(10), primary_key=True, index=True)
    station_name = Column(String(100), nullable=False)
    state = Column(String(50), nullable=False)
    zone = Column(String(10), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)


class Train(Base):
    __tablename__ = "trains"

    train_number = Column(String(10), primary_key=True, index=True)
    train_name = Column(String(100), nullable=False)
    train_type = Column(String(50), nullable=False)
    zone = Column(String(10), nullable=False)
    origin = Column(String(10), nullable=False)
    destination = Column(String(10), nullable=False)
    route_corridor = Column(String(50), nullable=False)


class RouteSection(Base):
    __tablename__ = "sections"

    section_id = Column(String(50), primary_key=True, index=True)
    from_station = Column(String(10), ForeignKey("stations.station_code"), nullable=False)
    to_station = Column(String(10), ForeignKey("stations.station_code"), nullable=False)
    geo_distance_km = Column(Float, nullable=False)
    scheduled_section_minutes = Column(Float, nullable=False)
    route_context = Column(String(50), nullable=False)


class TrainSchedule(Base):
    __tablename__ = "schedules"

    id = Column(Integer, primary_key=True, autoincrement=True)
    train_number = Column(String(10), ForeignKey("trains.train_number"), nullable=False, index=True)
    station_code = Column(String(10), ForeignKey("stations.station_code"), nullable=False, index=True)
    station_sequence = Column(Integer, nullable=False)
    scheduled_arrival = Column(String(10), nullable=True)
    scheduled_departure = Column(String(10), nullable=True)
    day_number = Column(Integer, default=1)
    distance_from_origin_km = Column(Float, default=0.0)


class SectionFeature(Base):
    __tablename__ = "section_features"

    section_id = Column(String(50), ForeignKey("sections.section_id"), primary_key=True)
    geo_distance_km = Column(Float, nullable=False)
    scheduled_section_minutes = Column(Float, nullable=False)
    avg_fog_risk_score = Column(Float, default=0.0)
    avg_zone_congestion_index = Column(Float, default=0.0)
    avg_season_severity_score = Column(Float, default=0.0)
    avg_psr_count = Column(Float, default=0.0)


class TrainHistorical(Base):
    __tablename__ = "train_historical"

    train_number = Column(String(10), ForeignKey("trains.train_number"), primary_key=True)
    historical_avg_delay_minutes = Column(Float, default=0.0)
    historical_ontime_pct = Column(Float, default=100.0)
    route_historical_ontime_pct = Column(Float, default=100.0)


class StationHistorical(Base):
    __tablename__ = "station_historical"

    station_code = Column(String(10), ForeignKey("stations.station_code"), primary_key=True)
    station_historical_delay_minutes = Column(Float, default=0.0)
    station_profile_available = Column(Integer, default=1)


class TrainState(Base):
    __tablename__ = "train_state"

    train_number = Column(String(10), primary_key=True, index=True)
    current_section_id = Column(String(50), nullable=True)
    current_station_code = Column(String(10), nullable=False)
    next_station_code = Column(String(10), nullable=True)
    progress_ratio = Column(Float, default=0.0) # 0.0 to 1.0 along current section
    position_km = Column(Float, default=0.0)
    current_delay_minutes = Column(Float, default=0.0)
    previous_section_delay_minutes = Column(Float, default=0.0)
    rolling_delay_3_sections = Column(Float, default=0.0)
    speed_kmh = Column(Float, default=80.0)
    status = Column(String(20), default="RUNNING") # RUNNING, HALTED, COMPLETED
    sequence_number = Column(Integer, default=1)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class OperationalEvent(Base):
    __tablename__ = "operational_events"

    event_id = Column(String(50), primary_key=True, index=True)
    event_type = Column(String(20), nullable=False) # WEATHER, TSR, CONGESTION
    section_id = Column(String(50), ForeignKey("sections.section_id"), nullable=False, index=True)
    severity = Column(Float, nullable=False, default=0.5) # 0.0 to 1.0
    start_time = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    end_time = Column(DateTime, nullable=True)
    source = Column(String(50), default="SIMULATOR")
    status = Column(String(20), default="ACTIVE") # ACTIVE, RESOLVED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class PredictionRecord(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    prediction_timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    train_number = Column(String(10), nullable=False, index=True)
    section_id = Column(String(50), nullable=False, index=True)
    station_code = Column(String(10), nullable=True)
    scheduled_section_minutes = Column(Float, nullable=False)
    baseline_minutes = Column(Float, nullable=False)
    residual_minutes = Column(Float, nullable=False)
    predicted_section_minutes = Column(Float, nullable=False)
    p10 = Column(Float, nullable=True)
    p50 = Column(Float, nullable=True)
    p90 = Column(Float, nullable=True)
    model_version = Column(String(50), default="mock-residual-v1")
    prediction_source = Column(String(20), default="mock") # ml, baseline, mock
    explanation_factors = Column(Text, nullable=True) # JSON serialized


class ActualArrivalRecord(Base):
    __tablename__ = "actual_arrivals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    train_number = Column(String(10), nullable=False, index=True)
    section_id = Column(String(50), nullable=False, index=True)
    station_code = Column(String(10), nullable=False)
    scheduled_arrival = Column(String(10), nullable=True)
    actual_arrival = Column(String(10), nullable=True)
    actual_traversal_minutes = Column(Float, nullable=False)
    baseline_traversal_minutes = Column(Float, nullable=False)
    predicted_traversal_minutes = Column(Float, nullable=False)
    error_baseline = Column(Float, nullable=False)
    error_ml = Column(Float, nullable=False)
    recorded_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class AlertRecord(Base):
    __tablename__ = "alerts"

    alert_id = Column(String(50), primary_key=True, index=True)
    alert_type = Column(String(50), nullable=False) # TSR_WARNING, CONGESTION_CASCADE, WEATHER_DELAY, ETA_JUMP
    severity = Column(String(20), default="MEDIUM") # LOW, MEDIUM, HIGH, CRITICAL
    reason = Column(Text, nullable=False)
    source_train = Column(String(10), nullable=True)
    source_section = Column(String(50), nullable=True)
    affected_trains = Column(Text, nullable=True) # JSON list
    estimated_impact = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    is_resolved = Column(Boolean, default=False)


class ModelVersionRecord(Base):
    __tablename__ = "model_versions"

    model_version = Column(String(50), primary_key=True)
    model_type = Column(String(50), nullable=False)
    feature_schema = Column(Text, nullable=False)
    feature_order = Column(Text, nullable=False)
    evaluation_metrics = Column(Text, nullable=True) # JSON
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ----------------- Database Init & Seeding -----------------

def init_db():
    """Create tables if they don't exist and seed reference data."""
    Base.metadata.create_all(bind=engine)
    seed_database_if_empty()


def seed_database_if_empty():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Station).first() is not None:
            return

        # 1. Seed Stations
        stations_path = DATA_DIR / "stations.json"
        if stations_path.exists():
            with open(stations_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    db.add(Station(**item))
            db.commit()

        # 2. Seed Trains
        trains_path = DATA_DIR / "trains.json"
        if trains_path.exists():
            with open(trains_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    db.add(Train(**item))
            db.commit()

        # 3. Seed Sections
        sections_path = DATA_DIR / "route_sections.csv"
        if sections_path.exists():
            with open(sections_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    db.add(RouteSection(
                        section_id=row["section_id"],
                        from_station=row["from_station"],
                        to_station=row["to_station"],
                        geo_distance_km=float(row["geo_distance_km"]),
                        scheduled_section_minutes=float(row["scheduled_section_minutes"]),
                        route_context=row["route_context"]
                    ))
            db.commit()

        # 4. Seed Schedules
        schedules_path = DATA_DIR / "schedules.json"
        if schedules_path.exists():
            with open(schedules_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                for item in data:
                    db.add(TrainSchedule(**item))
            db.commit()

        # 5. Seed Section Features
        sec_feat_path = DATA_DIR / "section_base_features.csv"
        if sec_feat_path.exists():
            with open(sec_feat_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    db.add(SectionFeature(
                        section_id=row["section_id"],
                        geo_distance_km=float(row["geo_distance_km"]),
                        scheduled_section_minutes=float(row["scheduled_section_minutes"]),
                        avg_fog_risk_score=float(row["avg_fog_risk_score"]),
                        avg_zone_congestion_index=float(row["avg_zone_congestion_index"]),
                        avg_season_severity_score=float(row["avg_season_severity_score"]),
                        avg_psr_count=float(row["avg_psr_count"])
                    ))
            db.commit()

        # 6. Seed Train Historical Profiles
        train_hist_path = DATA_DIR / "train_historical_profiles.csv"
        if train_hist_path.exists():
            with open(train_hist_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    db.add(TrainHistorical(
                        train_number=row["train_number"],
                        historical_avg_delay_minutes=float(row["historical_avg_delay_minutes"]),
                        historical_ontime_pct=float(row["historical_ontime_pct"]),
                        route_historical_ontime_pct=float(row["route_historical_ontime_pct"])
                    ))
            db.commit()

        # 7. Seed Station Historical Profiles
        st_hist_path = DATA_DIR / "station_historical_profiles.csv"
        if st_hist_path.exists():
            with open(st_hist_path, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    db.add(StationHistorical(
                        station_code=row["station_code"],
                        station_historical_delay_minutes=float(row["station_historical_delay_minutes"]),
                        station_profile_available=int(row["station_profile_available"])
                    ))
            db.commit()

        # 8. Seed Initial Active Model Version
        feature_order = [
            "geo_distance_km", "scheduled_section_minutes", "scheduled_hour",
            "current_delay_minutes", "previous_section_delay_minutes", "rolling_delay_3_sections",
            "historical_avg_delay_minutes", "historical_ontime_pct", "route_historical_ontime_pct",
            "station_historical_delay_minutes", "station_profile_available",
            "avg_fog_risk_score", "avg_zone_congestion_index", "avg_season_severity_score",
            "avg_psr_count", "weather_severity", "tsr_severity", "congestion_level",
            "trains_ahead", "baseline_section_minutes"
        ]
        db.add(ModelVersionRecord(
            model_version="mock-residual-v1",
            model_type="Mock Residual Model (XGBoost Contract)",
            feature_schema="Standard 19-Feature Railway Traversal Residual Contract",
            feature_order=json.dumps(feature_order),
            evaluation_metrics=json.dumps({
                "status": "ML under training - using deterministic mock residual engine",
                "baseline_mae": 3.82,
                "dynamic_mae": 1.45,
                "improvement_pct": 62.0
            }),
            is_active=True
        ))
        db.commit()

        # 9. Seed Initial Train States for 8 demo trains
        trains = db.query(Train).all()
        for t in trains:
            # find first section and stations
            scheds = db.query(TrainSchedule).filter_by(train_number=t.train_number).order_by(TrainSchedule.station_sequence).all()
            if len(scheds) >= 2:
                curr_st = scheds[0].station_code
                next_st = scheds[1].station_code
                sec_id = f"{curr_st}_{next_st}"
                db.add(TrainState(
                    train_number=t.train_number,
                    current_section_id=sec_id,
                    current_station_code=curr_st,
                    next_station_code=next_st,
                    progress_ratio=0.15,
                    position_km=10.0,
                    current_delay_minutes=0.0,
                    previous_section_delay_minutes=0.0,
                    rolling_delay_3_sections=0.0,
                    speed_kmh=95.0,
                    status="RUNNING",
                    sequence_number=1,
                    last_updated=datetime.now(timezone.utc)
                ))
        db.commit()

    finally:
        db.close()
