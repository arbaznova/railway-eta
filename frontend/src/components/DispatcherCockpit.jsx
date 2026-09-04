import React, { useState, useMemo } from 'react';
import {
  Activity, Map, Table, ShieldAlert, BarChart3,
  Train, Clock, AlertTriangle, CheckCircle, Zap
} from 'lucide-react';
import CorridorMap from './CorridorMap';
import TrainRoster from './TrainRoster';
import EtaMatrix from './EtaMatrix';
import EventInjector from './EventInjector';
import AlertsPanel from './AlertsPanel';
import AccuracyScoreboard from './AccuracyScoreboard';

export default function DispatcherCockpit({
  trains = [],
  selectedTrain,
  onSelectTrain,
  trainDetail,
  trainETA,
  sections = [],
  alerts = [],
  metrics,
  onInjectEvent,
  isInjecting
}) {
  const [activeTab, setActiveTab] = useState('OPERATIONS'); // 'OPERATIONS' | 'ETA' | 'DISRUPTIONS' | 'METRICS'

  // Network health KPIs
  const kpis = useMemo(() => {
    const total = trains.length;
    if (total === 0) return { total: 0, onTimePercent: 100, avgDelay: 0, activeAlerts: alerts.length };

    const onTimeCount = trains.filter((t) => (t.delay_minutes || 0) <= 5).length;
    const onTimePercent = Math.round((onTimeCount / total) * 100);
    const totalDelay = trains.reduce((acc, t) => acc + (t.delay_minutes || 0), 0);
    const avgDelay = (totalDelay / total).toFixed(1);

    return {
      total,
      onTimePercent,
      avgDelay,
      activeAlerts: alerts.length
    };
  }, [trains, alerts]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      gap: '1rem',
      padding: '1rem 1.25rem',
      maxWidth: '1600px',
      margin: '0 auto',
      width: '100%'
    }}>
      {/* Top Operational KPI Status Strip */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.85rem'
      }}>
        {/* KPI 1: Active Trains */}
        <div className="transit-card" style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'var(--brand-primary-light)',
            color: 'var(--brand-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Train size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Active Trains
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              {kpis.total} <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600 }}>Tracking</span>
            </div>
          </div>
        </div>

        {/* KPI 2: On-Time Performance */}
        <div className="transit-card" style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: kpis.onTimePercent >= 80 ? '#d1fae5' : '#fef3c7',
            color: kpis.onTimePercent >= 80 ? '#059669' : '#d97706',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              On-Time Rate
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              {kpis.onTimePercent}% <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>(within 5m)</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Average Delay */}
        <div className="transit-card" style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: Number(kpis.avgDelay) > 15 ? '#fee2e2' : '#f0fdf4',
            color: Number(kpis.avgDelay) > 15 ? '#dc2626' : '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Average Delay
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              {kpis.avgDelay} <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>mins / train</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Active Alerts */}
        <div className="transit-card" style={{ padding: '0.85rem 1.15rem', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: kpis.activeAlerts > 0 ? '#fef3c7' : '#f1f5f9',
            color: kpis.activeAlerts > 0 ? '#d97706' : '#64748b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={20} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
              Active Disruptions
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a' }}>
              {kpis.activeAlerts} <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>Corridor Alerts</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        borderBottom: '1px solid var(--border-color)',
        paddingBottom: '0.5rem',
        overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('OPERATIONS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'OPERATIONS' ? 'var(--brand-primary)' : 'transparent',
            color: activeTab === 'OPERATIONS' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Map size={16} />
          Live Operations (Map & Roster)
        </button>

        <button
          onClick={() => setActiveTab('ETA')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'ETA' ? 'var(--brand-primary)' : 'transparent',
            color: activeTab === 'ETA' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Table size={16} />
          Station ETAs Matrix
        </button>

        <button
          onClick={() => setActiveTab('DISRUPTIONS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'DISRUPTIONS' ? 'var(--brand-primary)' : 'transparent',
            color: activeTab === 'DISRUPTIONS' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <ShieldAlert size={16} />
          Disruption Simulator & Alerts
          {alerts.length > 0 && (
            <span style={{
              background: activeTab === 'DISRUPTIONS' ? '#ffffff' : '#ef4444',
              color: activeTab === 'DISRUPTIONS' ? '#ef4444' : '#ffffff',
              padding: '0.1rem 0.4rem',
              borderRadius: '9999px',
              fontSize: '0.7rem',
              fontWeight: 800
            }}>
              {alerts.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('METRICS')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.55rem 1.1rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'METRICS' ? 'var(--brand-primary)' : 'transparent',
            color: activeTab === 'METRICS' ? '#ffffff' : '#475569',
            fontWeight: 700,
            fontSize: '0.85rem',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <BarChart3 size={16} />
          ML Accuracy Scoreboard
        </button>
      </div>

      {/* Tab Panels */}
      <div style={{ flex: 1 }}>
        {/* Tab 1: Live Operations Map & Roster */}
        {activeTab === 'OPERATIONS' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '360px 1fr',
            gap: '1.25rem',
            alignItems: 'start'
          }}>
            <div style={{ height: 'calc(100vh - 250px)', overflowY: 'auto' }}>
              <TrainRoster
                trains={trains}
                selectedTrain={selectedTrain}
                onSelectTrain={onSelectTrain}
              />
            </div>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
              height: 'calc(100vh - 250px)',
              overflowY: 'auto'
            }}>
              <CorridorMap
                trainDetail={trainDetail}
                trainState={selectedTrain}
                sections={sections}
              />
              <EtaMatrix
                etaData={trainETA}
                trainDetail={trainDetail}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Station ETAs */}
        {activeTab === 'ETA' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <EtaMatrix
              etaData={trainETA}
              trainDetail={trainDetail}
            />
          </div>
        )}

        {/* Tab 3: Disruption Simulator */}
        {activeTab === 'DISRUPTIONS' && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(340px, 420px) 1fr',
            gap: '1.25rem',
            alignItems: 'start'
          }}>
            <EventInjector
              sections={sections}
              onInjectEvent={onInjectEvent}
              isInjecting={isInjecting}
            />
            <AlertsPanel alerts={alerts} />
          </div>
        )}

        {/* Tab 4: ML Accuracy Scoreboard */}
        {activeTab === 'METRICS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AccuracyScoreboard metrics={metrics} />
          </div>
        )}
      </div>
    </div>
  );
}
