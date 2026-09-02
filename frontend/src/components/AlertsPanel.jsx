import React from 'react';
import { AlertTriangle, Clock, ArrowRight, ShieldAlert } from 'lucide-react';

export default function AlertsPanel({ alerts = [] }) {
  return (
    <div className="b-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {/* Header */}
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
          ADVISORY ALERTS ({alerts.length})
        </span>
        <span className="b-badge b-badge-yellow" style={{ fontSize: '0.65rem' }}>
          CASCADE DETECTION
        </span>
      </div>

      {/* Alerts Feed */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.55rem',
        maxHeight: '260px',
        overflowY: 'auto'
      }}>
        {alerts.length === 0 ? (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: '#666',
            padding: '1rem',
            textAlign: 'center',
            background: '#faf8f5',
            border: '1.5px dashed #aaa'
          }}>
            [NO CRITICAL ADVISORY ALERTS ACTIVE]
          </div>
        ) : (
          alerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL' || alert.severity === 'HIGH';
            return (
              <div
                key={alert.alert_id}
                style={{
                  background: isCritical ? '#fff0f0' : '#fffde6',
                  border: '2px solid #000',
                  boxShadow: '2px 2px 0px #000',
                  padding: '0.6rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.3rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className={isCritical ? 'b-badge b-badge-red' : 'b-badge b-badge-yellow'}>
                    <ShieldAlert size={10} /> {alert.severity}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: '#666' }}>
                    {alert.created_at ? new Date(alert.created_at).toLocaleTimeString() : 'RECENT'}
                  </span>
                </div>

                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                  color: '#000'
                }}>
                  {alert.reason}
                </div>

                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.68rem',
                  color: '#444',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>IMPACT: <strong style={{ color: '#000' }}>{alert.estimated_impact || 'Moderate'}</strong></span>
                  {alert.source_section && <span>SEC: {alert.source_section}</span>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
