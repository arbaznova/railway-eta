import React from 'react';
import { Clock, Cpu, ShieldAlert, Sparkles, CheckCircle2, TrendingUp, Info } from 'lucide-react';

export default function EtaMatrix({ etaData, trainDetail }) {
  if (!etaData) {
    return (
      <div className="b-card" style={{ padding: '2rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        [LOADING STATION-BY-STATION ETA MATRIX...]
      </div>
    );
  }

  const upcomingStops = etaData.upcoming_stations || [];
  const explanations = etaData.explanation_summary || [];

  return (
    <div className="b-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Matrix Header */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: 'var(--border-width) solid var(--border-color)',
        paddingBottom: '0.6rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{
            background: '#000000',
            color: '#ffffff',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            fontSize: '0.8rem',
            padding: '0.2rem 0.5rem'
          }}>
            ETA PREDICTION MATRIX
          </span>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem' }}>
            {etaData.train_name} ({etaData.train_number})
          </span>
        </div>

        {/* Prediction Meta Badges */}
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span className="b-badge b-badge-cyan">
            <Cpu size={12} /> SOURCE: {etaData.prediction_source.toUpperCase()}
          </span>
          <span className="b-badge b-badge-yellow">
            MODEL: {etaData.model_version}
          </span>
        </div>
      </div>

      {/* Brutalist Data Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="b-table">
          <thead>
            <tr>
              <th>#</th>
              <th>STATION</th>
              <th>SCHEDULED</th>
              <th>RULE BASELINE</th>
              <th style={{ background: 'var(--border-color)', color: 'var(--hazard-yellow)' }}>
                DYNAMIC ETA (ML)
              </th>
              <th title="Predicted delay beyond scheduled timetable arrival time">DELAY FORECAST</th>
              <th>UNCERTAINTY [P10 — P90]</th>
              <th>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {upcomingStops.map((stop, idx) => {
              const isDone = stop.is_completed;
              // Delay forecast from scheduled timetable time
              let delay = stop.predicted_delay_minutes ?? 0;
              if (!isDone && delay === 0 && stop.dynamic_eta && (stop.scheduled_arrival || stop.scheduled_departure)) {
                const sched = stop.scheduled_arrival || stop.scheduled_departure;
                const [h1, m1] = stop.dynamic_eta.split(':').map(Number);
                const [h2, m2] = sched.split(':').map(Number);
                if (!isNaN(h1) && !isNaN(h2)) {
                  let diff = (h1 * 60 + m1) - (h2 * 60 + m2);
                  if (diff < -720) diff += 1440;
                  else if (diff > 720) diff -= 1440;
                  delay = Math.max(0, diff);
                }
              }
              const isNext = !isDone && upcomingStops.slice(0, idx).every(s => s.is_completed);

              return (
                <tr key={stop.station_code} className={isDone ? 'completed' : isNext ? 'active-target' : ''}>
                  <td style={{ fontWeight: 800 }}>{idx + 1}</td>
                  <td>
                    <strong style={{ color: '#000' }}>{stop.station_name}</strong>{' '}
                    <span style={{ color: '#666', fontSize: '0.72rem' }}>[{stop.station_code}]</span>
                  </td>
                  <td>{stop.scheduled_arrival || stop.scheduled_departure || '--:--'}</td>
                  <td style={{ color: '#333' }}>
                    {isDone ? stop.scheduled_arrival : stop.baseline_eta || '--:--'}
                  </td>
                  <td style={{
                    fontWeight: 800,
                    color: isDone ? '#555' : '#000',
                    background: isNext ? 'var(--hazard-yellow)' : isDone ? 'inherit' : '#e6faff'
                  }}>
                    {isDone ? stop.scheduled_arrival : stop.dynamic_eta || '--:--'}
                  </td>
                  <td>
                    {isDone ? (
                      <span style={{ color: '#666' }}>COMPLETED</span>
                    ) : delay > 0 ? (
                      <span style={{
                        color: delay > 15 ? 'var(--alert-red)' : 'var(--caution-orange)',
                        fontWeight: 800
                      }}>
                        +{delay.toFixed(1)} min
                      </span>
                    ) : (
                      <span style={{ color: 'var(--signal-green)', fontWeight: 800 }}>0.0m</span>
                    )}
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                    {!isDone && stop.p10_eta && stop.p90_eta ? (
                      <span>[{stop.p10_eta} — {stop.p90_eta}]</span>
                    ) : (
                      <span style={{ color: '#999' }}>--</span>
                    )}
                  </td>
                  <td>
                    {isDone ? (
                      <span className="b-badge b-badge-dark" style={{ fontSize: '0.62rem' }}>
                        <CheckCircle2 size={10} /> PASSED
                      </span>
                    ) : isNext ? (
                      <span className="b-badge b-badge-yellow" style={{ fontSize: '0.62rem' }}>
                        NEXT TARGET
                      </span>
                    ) : (
                      <span className="b-badge" style={{ fontSize: '0.62rem', background: '#eee' }}>
                        EN ROUTE
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Operational Diagnostic & Explanation Box */}
      <div style={{
        background: '#f8f6f0',
        border: 'var(--border-width) solid var(--border-color)',
        padding: '0.75rem 1rem',
        boxShadow: 'var(--shadow-hard-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontFamily: 'var(--font-mono)',
          fontWeight: 800,
          fontSize: '0.78rem'
        }}>
          <Info size={14} color="var(--caution-orange)" />
          OPERATIONAL PREDICTION EXPLAINABILITY & CASCADE DIAGNOSTICS:
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {explanations.map((exp, i) => (
            <div
              key={i}
              style={{
                background: '#ffffff',
                border: '1.5px solid #000',
                padding: '0.3rem 0.6rem',
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                boxShadow: '2px 2px 0px #000'
              }}
            >
              ► {exp}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
