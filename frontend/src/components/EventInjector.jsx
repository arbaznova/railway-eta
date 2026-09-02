import React, { useState } from 'react';
import { Zap, AlertTriangle, CloudRain, ShieldCheck, Flame, Play } from 'lucide-react';

export default function EventInjector({ sections = [], onInjectEvent, isInjecting }) {
  const [eventType, setEventType] = useState('TSR');
  const [selectedSection, setSelectedSection] = useState('');
  const [severity, setSeverity] = useState(0.7);
  const [successMsg, setSuccessMsg] = useState('');

  // Default to first section if empty
  const activeSectionId = selectedSection || (sections[0]?.section_id || 'NDLS_MTJ');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    try {
      await onInjectEvent(eventType, activeSectionId, severity);
      setSuccessMsg(`INJECTED ${eventType} (sev ${severity.toFixed(2)}) on ${activeSectionId}!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(`Injection error: ${err.message}`);
    }
  };

  const getSeverityLabel = (val) => {
    if (val >= 0.8) return 'CRITICAL DISRUPTION';
    if (val >= 0.5) return 'SEVERE DISRUPTION';
    if (val >= 0.3) return 'MODERATE IMPACT';
    return 'MILD RESTRICTION';
  };

  return (
    <div className="b-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* Console Header */}
      <div style={{
        background: 'var(--bg-inverse)',
        color: '#ffffff',
        border: 'var(--border-width) solid var(--border-color)',
        padding: '0.6rem 0.8rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.82rem' }}>
          OPERATIONAL EVENT INJECTION
        </span>
        <span className="b-badge b-badge-red" style={{ fontSize: '0.65rem' }}>
          SIMULATOR CONTROL
        </span>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Event Type Selector */}
        <div>
          <label style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            fontWeight: 800,
            marginBottom: '0.35rem'
          }}>
            1. SELECT DISRUPTION TYPE:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
            {[
              { type: 'TSR', label: 'TSR SPEED', color: 'var(--hazard-yellow)' },
              { type: 'WEATHER', label: 'WEATHER', color: 'var(--electric-cyan)' },
              { type: 'CONGESTION', label: 'CONGESTION', color: 'var(--track-purple)' }
            ].map(({ type, label, color }) => (
              <button
                key={type}
                type="button"
                onClick={() => setEventType(type)}
                className="b-button"
                style={{
                  padding: '0.4rem 0.2rem',
                  fontSize: '0.72rem',
                  background: eventType === type ? color : '#ffffff',
                  color: eventType === type && type === 'CONGESTION' ? '#ffffff' : '#000000',
                  boxShadow: eventType === type ? 'var(--shadow-hard-sm)' : 'none'
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Section Target Dropdown */}
        <div>
          <label style={{
            display: 'block',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            fontWeight: 800,
            marginBottom: '0.35rem'
          }}>
            2. TARGET RAILWAY SECTION:
          </label>
          <select
            value={activeSectionId}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="b-select"
          >
            {sections.map((sec) => (
              <option key={sec.section_id} value={sec.section_id}>
                {sec.section_id} ({sec.from_station} ➔ {sec.to_station} // {sec.geo_distance_km}km)
              </option>
            ))}
          </select>
        </div>

        {/* Severity Slider */}
        <div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            fontWeight: 800,
            marginBottom: '0.35rem'
          }}>
            <span>3. DISRUPTION SEVERITY:</span>
            <span style={{ color: severity >= 0.7 ? 'var(--alert-red)' : '#000' }}>
              {severity.toFixed(2)} [{getSeverityLabel(severity)}]
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={severity}
            onChange={(e) => setSeverity(parseFloat(e.target.value))}
          />
        </div>

        {/* Submit Injection Button */}
        <button
          type="submit"
          disabled={isInjecting}
          className="b-button b-button-yellow"
          style={{
            width: '100%',
            padding: '0.65rem',
            fontSize: '0.85rem',
            marginTop: '0.2rem'
          }}
        >
          <Zap size={16} />
          {isInjecting ? 'INJECTING DISRUPTION...' : 'INJECT OPERATIONAL DISRUPTION ⚡'}
        </button>

        {/* Success Confirmation Stamp */}
        {successMsg && (
          <div style={{
            background: 'var(--signal-green)',
            border: '2px solid #000',
            padding: '0.4rem 0.6rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            fontWeight: 800,
            color: '#000',
            boxShadow: '2px 2px 0px #000',
            textAlign: 'center'
          }}>
            ✓ {successMsg}
          </div>
        )}
      </form>
    </div>
  );
}
