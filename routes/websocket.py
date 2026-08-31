"""
WebSocket live streaming endpoint.

Provides real-time broadcasting of train telemetry, section states, ETA updates, and alerts.
"""

import json
import logging
from typing import Set
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)

router = APIRouter(tags=["WebSocket"])


class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total clients: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total clients: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        dead_connections = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                dead_connections.add(connection)

        for dead in dead_connections:
            self.active_connections.discard(dead)


manager = ConnectionManager()
ws_manager = manager



@router.websocket("/api/v1/live")
async def websocket_live_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time control-room telemetry and ETA streams.
    """
    await manager.connect(websocket)
    try:
        # Send initial connected message
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to Dynamic Railway ETA Live Telemetry Stream"
        })
        while True:
            # Keep receiving client pings or control messages
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection closed with error: {e}")
        manager.disconnect(websocket)
