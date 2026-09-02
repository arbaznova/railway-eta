import React, { useState, useEffect } from 'react';
import { Radio, RefreshCw, FastForward, RotateCcw, ShieldCheck, Activity } from 'lucide-react';

export default function Header({ isConnected, onTick, onReset, isTicking }) {
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toTimeString().split(' ')[0] + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header style={{
      background: 'var(--bg-inverse)',
      color: '#ffffff',
      borderBottom: 'var(--border-width) solid var(--border-color)',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '1rem'
    }}>
      {/* Brand Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{
          background: 'var(--hazard-yellow)',
          color: '#000000',
          fontWeight: 900,
          fontFamily: 'var(--font-heading)',
          fontSize: '1.25rem',
          padding: '0.3rem 0.75rem',
          border: '2px solid #ffffff',
          boxShadow: '3px 3px 0px #ffffff',
          letterSpacing: '0.05em'
        }}>
          RAIL-OPS // ETA
        </div>
        <div>
          <h1 style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.95rem',
            fontWeight: 800,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: '#ffffff'
          }}>
            DYNAMIC RAILWAY ETA & DECISION SUPPORT SYSTEM
          </h1>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: '#a0a5b5',
            display: 'flex',
            gap: '0.75rem',
            alignItems: 'center'
          }}>
            <span>SECTION-LEVEL PREDICTION</span>
            <span>•</span>
            <span style={{ color: 'var(--electric-cyan)' }}>RULE BASELINE + ML RESIDUAL</span>
            <span>•</span>
            <span style={{ color: 'var(--hazard-yellow)' }}>[v1.0-BRUTALIST]</span>
          </div>
        </div>
      </div>

      {/* Telemetry Status Badges */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        {/* Live Clock */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 800,
          fontSize: '0.88rem',
          background: '#1c1e24',
          padding: '0.35rem 0.7rem',
          border: '1.5px solid #444',
          color: 'var(--hazard-yellow)'
        }}>
          {timeStr}
        </div>

        {/* WebSocket Heartbeat */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          fontWeight: 800,
          padding: '0.35rem 0.75rem',
          border: '2px solid #ffffff',
          background: isConnected ? '#052c17' : '#3d0a0a',
          color: isConnected ? 'var(--signal-green)' : 'var(--alert-red)'
        }}>
          <span className={`status-dot ${isConnected ? 'status-dot-green' : 'status-dot-red'}`} />
          {isConnected ? 'LIVE FEED: CONNECTED' : 'LIVE FEED: DISCONNECTED'}
        </div>

        {/* Predictor Mode Badge */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          fontWeight: 800,
          padding: '0.35rem 0.75rem',
          border: '2px solid #ffffff',
          background: 'var(--electric-cyan)',
          color: '#000000'
        }}>
          PREDICTOR: MOCK RESIDUAL (PLUGGABLE XGBOOST)
        </div>

        {/* Simulation Controls */}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={() => onTick(60)}
            disabled={isTicking}
            className="b-button b-button-yellow"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
            title="Advance simulation by 60 seconds"
          >
            <FastForward size={14} /> +60s TICK
          </button>
          <button
            onClick={() => onTick(300)}
            disabled={isTicking}
            className="b-button b-button-yellow"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
            title="Advance simulation by 5 minutes"
          >
            <FastForward size={14} /> +5m
          </button>
          <button
            onClick={onReset}
            className="b-button b-button-red"
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
            title="Reset active simulation and clear events"
          >
            <RotateCcw size={14} /> RESET
          </button>
        </div>
      </div>
    </header>
  );
}
