"""
FastAPI Main Application.

Configures:
- Application lifecycle (database init, seed check, background simulation loop)
- CORS middleware for React control-room dashboard
- Health check endpoint (/health)
- API v1 routers and WebSocket endpoints
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from models.database import init_db, SessionLocal, Train, OperationalEvent
from services.simulator import simulator
from services.predictor import get_predictor
from routes.websocket import ws_manager
from routes import (
    trains_router, eta_router, stations_router, network_router,
    alerts_router, metrics_router, simulation_router, websocket_router
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Initialize database & start background train simulator
    init_db()
    simulator.start(broadcast_callback=ws_manager.broadcast)
    yield
    # Shutdown: Stop simulator
    simulator.stop()


app = FastAPI(
    title="Dynamic Railway ETA Prediction & Decision Support Agent",
    description=(
        "Section-level railway ETA prediction and operational decision support system. "
        "Fuses deterministic rule baseline with ML residual corrections, station propagation, "
        "and real-time event simulation."
    ),
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for Frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register Routers
app.include_router(trains_router)
app.include_router(eta_router)
app.include_router(stations_router)
app.include_router(network_router)
app.include_router(alerts_router)
app.include_router(metrics_router)
app.include_router(simulation_router)
app.include_router(websocket_router)


@app.get("/")
def root():
    return {
        "service": "Dynamic Railway ETA Prediction & Decision Support Agent",
        "status": "online",
        "docs": "/docs",
        "health": "/health",
        "api_prefix": "/api/v1"
    }


@app.get("/health")
def health_check():
    """
    Health check endpoint returning system, model, database, and simulator status.
    """
    db = SessionLocal()
    try:
        train_count = db.query(Train).count()
        event_count = db.query(OperationalEvent).filter_by(status="ACTIVE").count()
        db_status = "connected"
    except Exception as e:
        train_count = 0
        event_count = 0
        db_status = f"error: {str(e)}"
    finally:
        db.close()

    predictor = get_predictor()

    return {
        "status": "healthy",
        "database": db_status,
        "active_trains": train_count,
        "active_operational_events": event_count,
        "simulator_running": simulator.is_running,
        "prediction_engine": {
            "source": "mock" if predictor.__class__.__name__ == "MockPredictor" else "ml",
            "model_version": getattr(predictor, "version", "mock-residual-v1"),
            "fallback_available": True
        }
    }
