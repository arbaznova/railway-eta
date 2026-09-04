import React, { useState, useEffect } from 'react';
import {
  Train, Radio, RefreshCw, FastForward, RotateCcw, ShieldCheck,
  Activity, Target, Play, Pause, AlertCircle, Compass, LayoutDashboard
} from 'lucide-react';

export default function Header({
  isConnected,
  onTick,
  onReset,
  isTicking,
  trains = [],
  selectedTrain,
  onSelectTrain,
  isSimPaused,
  onTogglePlayPause,
  activeMode = 'passenger',
  onChangeMode
}) {
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
      background: '#0f172a',
      color: '#ffffff',
      borderBottom: '1px solid #1e293b',
      padding: '0.65rem 1.25rem',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '1rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }}>
      {/* Brand & Live Beacon */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.55rem',
          background: 'linear-gradient(135deg, #0284c7, #0369a1)',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '1.05rem',
          padding: '0.4rem 0.85rem',
          borderRadius: '10px',
          letterSpacing: '-0.01em',
          boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)'
        }}>
          <Train size={18} />
          <span>RailLive ETA</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="status-dot status-dot-green" />
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
            Live Northern Corridor
          </span>
        </div>
      </div>

      {/* Center: High-Visibility Role Switcher */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: '#1e293b',
        padding: '0.25rem',
        borderRadius: '9999px',
        border: '1px solid #334155'
      }}>
        <button
          onClick={() => onChangeMode('passenger')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 1.1rem',
            borderRadius: '9999px',
            border: 'none',
            background: activeMode === 'passenger' ? 'var(--brand-primary)' : 'transparent',
            color: activeMode === 'passenger' ? '#ffffff' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeMode === 'passenger' ? '0 2px 8px rgba(2, 132, 199, 0.4)' : 'none'
          }}
        >
          <Compass size={15} />
          Passenger Tracker
        </button>

        <button
          onClick={() => onChangeMode('dispatcher')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 1.1rem',
            borderRadius: '9999px',
            border: 'none',
            background: activeMode === 'dispatcher' ? '#f59e0b' : 'transparent',
            color: activeMode === 'dispatcher' ? '#000000' : '#94a3b8',
            fontWeight: 700,
            fontSize: '0.84rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: activeMode === 'dispatcher' ? '0 2px 8px rgba(245, 158, 11, 0.4)' : 'none'
          }}
        >
          <LayoutDashboard size={15} />
          Dispatcher Cockpit
        </button>
      </div>

      {/* Right Controls Area */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        {/* Live Clock */}
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          fontSize: '0.82rem',
          background: '#1e293b',
          padding: '0.35rem 0.65rem',
          borderRadius: '6px',
          border: '1px solid #334155',
          color: '#38bdf8'
        }}>
          {timeStr}
        </div>

        {/* Dispatcher Mode Simulation Controls */}
        {activeMode === 'dispatcher' && (
          <>
            {/* Simulation Status Tag */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: isSimPaused ? '#2b2300' : '#052c17',
              color: isSimPaused ? 'var(--hazard-yellow)' : 'var(--signal-green)'
            }}>
              <span className={`status-dot ${isSimPaused ? 'status-dot-yellow' : 'status-dot-green'}`} style={{
                background: isSimPaused ? 'var(--hazard-yellow)' : 'var(--signal-green)'
              }} />
              {isSimPaused ? 'SIM PAUSED' : 'AUTO RUNNING'}
            </div>

            {/* Play/Pause & Step */}
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                onClick={onTogglePlayPause}
                className={`b-button ${isSimPaused ? 'b-button-cyan' : 'b-button-yellow'}`}
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                title={isSimPaused ? 'Resume auto-advancing simulation' : 'Pause automatic simulation time'}
              >
                {isSimPaused ? <Play size={13} /> : <Pause size={13} />}
                {isSimPaused ? 'Resume' : 'Pause'}
              </button>

              <button
                onClick={() => onTick(60)}
                disabled={isTicking}
                className="b-button b-button-yellow"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                title="Advance simulation manually by 60 seconds"
              >
                <FastForward size={13} /> +60s
              </button>

              <button
                onClick={onReset}
                className="b-button b-button-red"
                style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
                title="Reset active simulation and clear events"
              >
                <RotateCcw size={13} /> Reset
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
