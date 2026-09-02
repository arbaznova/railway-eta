import React from 'react';
import { Gauge, Clock, ArrowRight, Activity, AlertCircle } from 'lucide-react';

export default function TrainRoster({ trains, selectedTrain, onSelectTrain }) {
  return (
    <aside style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      height: '100%',
      overflowY: 'auto'
    }}>
      {/* Panel Header */}
      <div style={{
        background: 'var(--bg-inverse)',
        color: '#ffffff',
        border: 'var(--border-width) solid var(--border-color)',
        padding: '0.6rem 0.8rem',
        boxShadow: 'var(--shadow-hard-sm)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.85rem' }}>
          ACTIVE TRAINS ({trains.length})
        </span>
        <span className="b-badge b-badge-yellow" style={{ fontSize: '0.65rem' }}>
          LIVE ROSTER
        </span>
      </div>

      {/* Train Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {trains.map((train) => {
          const isSelected = selectedTrain?.train_number === train.train_number;
          const delay = train.current_delay_minutes || 0;
          const delayColor = delay > 15 ? 'var(--alert-red)' : delay > 5 ? 'var(--hazard-yellow)' : 'var(--signal-green)';
          const delayTextColor = delay > 15 ? '#ffffff' : '#000000';

          return (
            <div
              key={train.train_number}
              onClick={() => onSelectTrain(train.train_number)}
              style={{
                background: isSelected ? '#fffde6' : '#ffffff',
                border: 'var(--border-width) solid var(--border-color)',
                boxShadow: isSelected ? 'var(--shadow-hard-lg)' : 'var(--shadow-hard-sm)',
                transform: isSelected ? 'translate(-2px, -2px)' : 'none',
                padding: '0.75rem',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
                position: 'relative'
              }}
            >
              {/* Selected Arrow Indicator */}
              {isSelected && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  bottom: 0,
                  width: '6px',
                  background: 'var(--border-color)'
                }} />
              )}

              {/* Card Top: Number, Type, Delay */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{
                    background: '#000000',
                    color: '#ffffff',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    padding: '0.15rem 0.45rem'
                  }}>
                    {train.train_number}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    border: '1px solid #000',
                    padding: '0.15rem 0.35rem',
                    background: '#eeeeee'
                  }}>
                    {train.train_type}
                  </span>
                </div>

                {/* Delay Badge */}
                <div style={{
                  background: delayColor,
                  color: delayTextColor,
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  border: '1.5px solid #000',
                  padding: '0.15rem 0.45rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.2rem'
                }}>
                  <Clock size={11} />
                  {delay > 0 ? `+${delay.toFixed(1)}m` : 'ON TIME'}
                </div>
              </div>

              {/* Train Name */}
              <div style={{
                fontWeight: 800,
                fontSize: '0.88rem',
                fontFamily: 'var(--font-display)',
                marginBottom: '0.35rem',
                color: '#000000'
              }}>
                {train.train_name}
              </div>

              {/* Origin -> Destination Route */}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: '#555',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                marginBottom: '0.45rem'
              }}>
                <span>{train.origin}</span>
                <ArrowRight size={11} />
                <span>{train.destination}</span>
                <span style={{ marginLeft: 'auto', color: '#888' }}>({train.zone})</span>
              </div>

              {/* Progress & Speed Telemetry */}
              <div style={{
                background: '#f5f3ee',
                border: '1.5px solid #000',
                padding: '0.35rem 0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Gauge size={12} />
                  <span>{train.speed_kmh ? `${train.speed_kmh} km/h` : '80 km/h'}</span>
                </div>
                <div style={{ fontWeight: 700, color: '#333' }}>
                  SEC: {train.current_section_id || 'STATION'}
                </div>
              </div>

              {/* Mini Section Progress Bar */}
              <div style={{
                marginTop: '0.35rem',
                height: '5px',
                background: '#e0ded8',
                border: '1px solid #000',
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  width: `${Math.round((train.progress_ratio || 0) * 100)}%`,
                  background: 'var(--hazard-yellow)',
                  borderRight: '1px solid #000'
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
