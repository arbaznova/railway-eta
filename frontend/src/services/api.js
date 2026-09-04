/**
 * Backend API Client & WebSocket Connector
 */

function getApiBase() {
  if (import.meta.env.VITE_API_BASE !== undefined) {
    return import.meta.env.VITE_API_BASE;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return '';
    }
  }
  return 'http://localhost:8000';
}

function getWsBase() {
  if (import.meta.env.VITE_WS_BASE !== undefined) {
    return import.meta.env.VITE_WS_BASE;
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${protocol}//${window.location.host}`;
    }
  }
  return 'ws://localhost:8000';
}

const API_BASE = getApiBase();
const WS_BASE = getWsBase();

export async function fetchTrains() {
  const res = await fetch(`${API_BASE}/api/v1/trains`);
  if (!res.ok) throw new Error('Failed to fetch trains');
  return res.json();
}

export async function fetchTrainDetail(trainNumber) {
  const res = await fetch(`${API_BASE}/api/v1/trains/${trainNumber}`);
  if (!res.ok) throw new Error(`Failed to fetch train ${trainNumber}`);
  return res.json();
}

export async function fetchTrainETA(trainNumber) {
  const res = await fetch(`${API_BASE}/api/v1/eta/${trainNumber}`);
  if (!res.ok) throw new Error(`Failed to fetch ETA for train ${trainNumber}`);
  return res.json();
}

export async function fetchSections() {
  const res = await fetch(`${API_BASE}/api/v1/network/sections`);
  if (!res.ok) throw new Error('Failed to fetch sections');
  return res.json();
}

export async function fetchAlerts() {
  const res = await fetch(`${API_BASE}/api/v1/alerts`);
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function fetchAccuracyMetrics() {
  const res = await fetch(`${API_BASE}/api/v1/metrics/accuracy`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export async function injectDisruption(eventType, sectionId, severity) {
  const res = await fetch(`${API_BASE}/api/v1/simulation/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event_type: eventType,
      section_id: sectionId,
      severity: parseFloat(severity),
      source: 'CONTROL_ROOM_INJECTION'
    })
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Injection failed');
  }
  return res.json();
}

export async function stepSimulation(seconds = 60) {
  const res = await fetch(`${API_BASE}/api/v1/simulation/tick?seconds=${seconds}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to step simulation');
  return res.json();
}

export async function resetSimulation() {
  const res = await fetch(`${API_BASE}/api/v1/simulation/reset`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to reset simulation');
  return res.json();
}

export async function fetchSimulationStatus() {
  const res = await fetch(`${API_BASE}/api/v1/simulation/status`);
  if (!res.ok) throw new Error('Failed to fetch simulation status');
  return res.json();
}

export async function pauseSimulation() {
  const res = await fetch(`${API_BASE}/api/v1/simulation/pause`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to pause simulation');
  return res.json();
}

export async function resumeSimulation() {
  const res = await fetch(`${API_BASE}/api/v1/simulation/resume`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to resume simulation');
  return res.json();
}

export function createWebSocketConnection(onMessage, onStatusChange) {
  let ws = null;
  let reconnectTimer = null;

  function connect() {
    try {
      ws = new WebSocket(`${WS_BASE}/api/v1/live`);

      ws.onopen = () => {
        if (onStatusChange) onStatusChange(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) onMessage(data);
        } catch (e) {
          console.error('Error parsing WS message', e);
        }
      };

      ws.onclose = () => {
        if (onStatusChange) onStatusChange(false);
        reconnectTimer = setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        if (onStatusChange) onStatusChange(false);
        ws.close();
      };
    } catch (e) {
      if (onStatusChange) onStatusChange(false);
      reconnectTimer = setTimeout(connect, 3000);
    }
  }

  connect();

  return () => {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) ws.close();
  };
}
