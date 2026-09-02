import React from 'react';
import { MapPin, AlertTriangle, CloudRain, Flame } from 'lucide-react';

export default function CorridorMap({ trainDetail, trainState, sections = [] }) {
  if (!trainDetail || !trainDetail.stops || trainDetail.stops.length === 0) {
    return (
      <div className="b-card" style={{ padding: '1.5rem', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
        [NO ROUTE TOPOLOGY LOADED FOR SELECTED TRAIN]
      </div>
    );
  }

  const stops = trainDetail.stops;
  const currSection = trainState?.current_section_id || '';
  const progressRatio = trainState?.progress_ratio || 0;

  // Find active disruptions on the route
  const activeEventsMap = {};
  sections.forEach((sec) => {
    if (sec.active_events && sec.active_events.length > 0) {
      activeEventsMap[sec.section_id] = sec.active_events;
    }
  });

  return (
    <div className="b-card" style={{ padding: '1rem', background: '#ffffff' }}>
      {/* Schematic Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: 'var(--border-width) solid var(--border-color)',
        paddingBottom: '0.6rem',
        marginBottom: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{
            background: 'var(--hazard-yellow)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 800,
            fontSize: '0.75rem',
            padding: '0.2rem 0.5rem',
            border: '1.5px solid #000'
          }}>
            CORRIDOR TOPOLOGY
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.85rem' }}>
            {trainDetail.train_number} // {trainDetail.route_corridor}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: '#555' }}>
          CURRENT SECTION: <strong style={{ color: '#000' }}>{currSection || 'AT STATION'}</strong> ({Math.round(progressRatio * 100)}% TRAVERSED)
        </div>
      </div>

      {/* Schematic Track Horizontal Diagram */}
      <div style={{
        overflowX: 'auto',
        padding: '1.5rem 0.5rem 2rem 0.5rem'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          minWidth: `${stops.length * 150}px`,
          position: 'relative'
        }}>
          {stops.map((stop, idx) => {
            const isLast = idx === stops.length - 1;
            const nextStop = !isLast ? stops[idx + 1] : null;
            const secId = nextStop ? `${stop.station_code}_${nextStop.station_code}` : '';
            const isCurrentSection = secId === currSection;
            const activeDisruptions = secId ? activeEventsMap[secId] || [] : [];
            const hasDisruption = activeDisruptions.length > 0;

            // Station passed status
            const currStIdx = stops.findIndex(s => s.station_code === trainState?.current_station_code);
            const isPassed = idx < currStIdx;
            const isCurrentStop = idx === currStIdx;

            return (
              <React.Fragment key={stop.station_code}>
                {/* Station Node Block */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: 2,
                  width: '110px'
                }}>
                  {/* Station Tag */}
                  <div style={{
                    background: isCurrentStop ? 'var(--hazard-yellow)' : isPassed ? '#ddd' : '#ffffff',
                    border: 'var(--border-width) solid var(--border-color)',
                    boxShadow: isCurrentStop ? '3px 3px 0px #000' : '2px 2px 0px #000',
                    padding: '0.35rem 0.6rem',
                    textAlign: 'center',
                    minWidth: '85px'
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      color: '#000'
                    }}>
                      {stop.station_code}
                    </div>
                    <div style={{
                      fontSize: '0.65rem',
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '90px'
                    }}>
                      {stop.station_name}
                    </div>
                  </div>

                  {/* Scheduled Time beneath */}
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    color: '#666',
                    marginTop: '0.3rem',
                    fontWeight: 700
                  }}>
                    {stop.scheduled_arrival || stop.scheduled_departure || '--:--'}
                  </div>
                </div>

                {/* Track Section Line */}
                {!isLast && (
                  <div style={{
                    flex: 1,
                    height: '14px',
                    background: hasDisruption ? 'repeating-linear-gradient(-45deg, #000, #000 8px, #ff3b30 8px, #ff3b30 16px)' : isPassed ? '#555' : '#ffffff',
                    border: '2px solid #000',
                    boxShadow: '1.5px 1.5px 0px #000',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {/* Active Train Marker */}
                    {isCurrentSection && (
                      <div style={{
                        position: 'absolute',
                        left: `${Math.max(10, Math.min(90, progressRatio * 100))}%`,
                        transform: 'translate(-50%, -50%)',
                        top: '50%',
                        background: 'var(--hazard-yellow)',
                        border: '2px solid #000',
                        boxShadow: '3px 3px 0px #000',
                        padding: '0.2rem 0.45rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.72rem',
                        fontWeight: 900,
                        zIndex: 4,
                        whiteSpace: 'nowrap'
                      }}>
                        🚆 {trainState.train_number}
                      </div>
                    )}

                    {/* Active Disruption Flag */}
                    {hasDisruption && (
                      <div style={{
                        position: 'absolute',
                        top: '-24px',
                        background: 'var(--alert-red)',
                        color: '#fff',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        padding: '0.1rem 0.35rem',
                        border: '1.5px solid #000',
                        boxShadow: '2px 2px 0px #000',
                        zIndex: 3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.2rem'
                      }}>
                        <AlertTriangle size={10} />
                        {activeDisruptions[0].event_type}
                      </div>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}
