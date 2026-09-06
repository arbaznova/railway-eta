import React, { useState } from 'react';
import { Map, Table, ShieldAlert } from 'lucide-react';
import CorridorMap from './CorridorMap';
import TrainRoster from './TrainRoster';
import EtaMatrix from './EtaMatrix';
import EventInjector from './EventInjector';
import AlertsPanel from './AlertsPanel';

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
  const [activeTab, setActiveTab] = useState('OPERATIONS'); // 'OPERATIONS' | 'ETA' | 'DISRUPTIONS'

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
            <div style={{ height: 'calc(100vh - 170px)', overflowY: 'auto' }}>
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
              height: 'calc(100vh - 170px)',
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
                selectedTrain={selectedTrain}
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
              selectedTrain={selectedTrain}
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
      </div>
    </div>
  );
}
