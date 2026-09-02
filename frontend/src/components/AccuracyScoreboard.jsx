import React from 'react';
import { Target, TrendingUp, BarChart3, CheckCheck } from 'lucide-react';

export default function AccuracyScoreboard({ metrics }) {
  if (!metrics) return null;

  return (
    <div style={{
      background: 'var(--bg-inverse)',
      color: '#ffffff',
      borderTop: 'var(--border-width) solid var(--border-color)',
      padding: '0.75rem 1.5rem',
      display: 'flex',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: '1rem',
      fontFamily: 'var(--font-mono)'
    }}>
      {/* Title & Total Sections */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{
          background: 'var(--electric-cyan)',
          color: '#000',
          fontWeight: 900,
          fontSize: '0.75rem',
          padding: '0.2rem 0.5rem',
          border: '1.5px solid #fff'
        }}>
          ACCURACY SCOREBOARD
        </div>
        <div style={{ fontSize: '0.75rem', color: '#a0a5b5' }}>
          GROUND TRUTH ACTUALS EVALUATED: <strong style={{ color: '#fff' }}>{metrics.total_completed_sections}</strong>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Baseline MAE */}
        <div>
          <div style={{ fontSize: '0.65rem', color: '#888' }}>BASELINE MAE</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--caution-orange)' }}>
            {metrics.baseline_mae?.toFixed(2)}m
          </div>
        </div>

        {/* Dynamic ML MAE */}
        <div>
          <div style={{ fontSize: '0.65rem', color: '#888' }}>DYNAMIC ML MAE</div>
          <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--signal-green)' }}>
            {metrics.dynamic_mae?.toFixed(2)}m
          </div>
        </div>

        {/* RMSE Comparison */}
        <div>
          <div style={{ fontSize: '0.65rem', color: '#888' }}>RMSE (BASE / ML)</div>
          <div style={{ fontSize: '0.85rem', fontWeight: 800 }}>
            {metrics.baseline_rmse?.toFixed(2)}m / {metrics.dynamic_rmse?.toFixed(2)}m
          </div>
        </div>

        {/* Improvement Percentage Badge */}
        <div style={{
          background: 'var(--hazard-yellow)',
          color: '#000',
          border: '2px solid #fff',
          padding: '0.3rem 0.65rem',
          fontWeight: 900,
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem'
        }}>
          <TrendingUp size={14} />
          <span>+{metrics.improvement_percentage?.toFixed(1)}% ML GAIN</span>
        </div>
      </div>

      {/* Note / Disclaimer */}
      <div style={{ fontSize: '0.65rem', color: '#888', maxWidth: '340px' }}>
        {metrics.status_note || 'Ground truth actuals evaluated vs Baseline & Residual predictions.'}
      </div>
    </div>
  );
}
