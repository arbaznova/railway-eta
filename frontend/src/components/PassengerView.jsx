import React, { useState, useMemo } from 'react';
import {
  Search, Train, Clock, MapPin, Navigation, AlertTriangle,
  CheckCircle2, ArrowRight, ShieldCheck, Zap, RefreshCw,
  Gauge, Calendar, ChevronRight, Compass
} from 'lucide-react';

export default function PassengerView({
  trains = [],
  selectedTrain,
  trainDetail,
  trainETA,
  onSelectTrain,
  alerts = []
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllStops, setShowAllStops] = useState(true);

  // Filtered train list for search & chips
  const filteredTrains = useMemo(() => {
    return trains.filter((t) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesQuery =
        !query ||
        t.train_number.toLowerCase().includes(query) ||
        t.train_name.toLowerCase().includes(query) ||
        (t.origin_station && t.origin_station.toLowerCase().includes(query)) ||
        (t.destination_station && t.destination_station.toLowerCase().includes(query));

      return matchesQuery;
    });
  }, [trains, searchQuery]);

  // Relevant advisories for selected train
  const relevantAlerts = useMemo(() => {
    if (!selectedTrain) return [];
    return alerts.filter(
      (a) =>
        a.train_number === selectedTrain.train_number ||
        (a.section_id && selectedTrain.current_section && a.section_id === selectedTrain.current_section)
    );
  }, [alerts, selectedTrain]);

  const upcomingStops = trainETA?.upcoming_stations || [];

  // Calculate route progress percentage
  const progressPercent = useMemo(() => {
    if (!upcomingStops || upcomingStops.length === 0) return 40;
    const completed = upcomingStops.filter((s) => s.is_completed).length;
    return Math.min(100, Math.max(8, Math.round((completed / upcomingStops.length) * 100)));
  }, [upcomingStops]);

  // Find next station
  const nextStop = useMemo(() => {
    if (!upcomingStops || upcomingStops.length === 0) return null;
    return upcomingStops.find((s) => !s.is_completed) || upcomingStops[upcomingStops.length - 1];
  }, [upcomingStops]);

  // Delay stats
  const delayMinutes = selectedTrain?.delay_minutes || 0;
  const isDelayed = delayMinutes > 5;
  const isSeverelyDelayed = delayMinutes > 25;

  return (
    <div style={{
      maxWidth: '1200px',
      margin: '0 auto',
      width: '100%',
      padding: '1.25rem 1rem 3rem 1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    }}>
      {/* Search & Quick Train Selector */}
      <div className="transit-card" style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        padding: '1rem 1.25rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '0.75rem',
          justifyContent: 'space-between'
        }}>
          {/* Search Box */}
          <div style={{
            position: 'relative',
            width: '100%',
            display: 'flex',
            alignItems: 'center'
          }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', color: '#64748b' }} />
            <input
              type="text"
              className="b-input"
              style={{
                paddingLeft: '2.5rem',
                borderRadius: '9999px',
                fontSize: '0.92rem',
                background: '#f8fafc'
              }}
              placeholder="Search train by name or number (e.g. 12002, Shatabdi, Rajdhani)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#94a3b8',
                  fontSize: '0.9rem'
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Popular / Searched Trains Horizontal Carousel */}
        <div style={{
          display: 'flex',
          gap: '0.5rem',
          overflowX: 'auto',
          paddingBottom: '0.35rem',
          alignItems: 'center'
        }}>
          <span style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            whiteSpace: 'nowrap'
          }}>
            Select Train:
          </span>
          {filteredTrains.map((t) => {
            const isSelected = selectedTrain?.train_number === t.train_number;
            const tDelay = t.delay_minutes || 0;
            return (
              <button
                key={t.train_number}
                onClick={() => onSelectTrain(t.train_number)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '0.4rem 0.85rem',
                  borderRadius: '8px',
                  border: isSelected ? '2px solid var(--brand-primary)' : '1px solid #e2e8f0',
                  background: isSelected ? 'var(--brand-primary-light)' : '#ffffff',
                  color: isSelected ? 'var(--brand-primary-dark)' : '#1e293b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 700 : 500,
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 6px rgba(2, 132, 199, 0.2)' : 'none'
                }}
              >
                <Train size={14} color={isSelected ? 'var(--brand-primary)' : '#64748b'} />
                <span>{t.train_name}</span>
                <span style={{
                  fontSize: '0.72rem',
                  padding: '0.1rem 0.35rem',
                  borderRadius: '4px',
                  background: tDelay > 5 ? '#fef3c7' : '#d1fae5',
                  color: tDelay > 5 ? '#92400e' : '#065f46',
                  fontWeight: 600
                }}>
                  {tDelay > 0 ? `+${tDelay}m` : 'On Time'}
                </span>
              </button>
            );
          })}
          {filteredTrains.length === 0 && (
            <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>No trains matching your filter</span>
          )}
        </div>
      </div>

      {selectedTrain ? (
        <>
          {/* Hero Live Journey Status Banner */}
          <div className="transit-card" style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            border: 'none',
            boxShadow: 'var(--shadow-lg)',
            padding: '1.75rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            {/* Background train watermark motif */}
            <div style={{
              position: 'absolute',
              right: '-20px',
              bottom: '-30px',
              opacity: 0.06,
              pointerEvents: 'none'
            }}>
              <Train size={240} />
            </div>

            {/* Top row: Train Identity & Status Pill */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: '1rem',
              marginBottom: '1.5rem'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.35rem' }}>
                  <span style={{
                    background: 'var(--brand-primary)',
                    color: '#ffffff',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    letterSpacing: '0.04em'
                  }}>
                    #{selectedTrain.train_number}
                  </span>
                  <span style={{
                    fontSize: '0.85rem',
                    color: '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}>
                    <Zap size={14} color="#38bdf8" /> Live Satellite Tracking
                  </span>
                </div>
                <h1 style={{
                  color: '#ffffff',
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  margin: 0
                }}>
                  {selectedTrain.train_name}
                </h1>
              </div>

              {/* Status Pill */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '9999px',
                background: isDelayed
                  ? isSeverelyDelayed ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'
                  : 'rgba(16, 185, 129, 0.2)',
                border: `1px solid ${
                  isDelayed
                    ? isSeverelyDelayed ? '#ef4444' : '#f59e0b'
                    : '#10b981'
                }`
              }}>
                <span className={`status-dot ${isDelayed ? 'status-dot-red' : 'status-dot-green'}`} />
                <span style={{
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  color: isDelayed
                    ? isSeverelyDelayed ? '#fca5a5' : '#fde68a'
                    : '#6ee7b7'
                }}>
                  {isDelayed ? `DELAYED BY ~${delayMinutes} MINS` : 'RUNNING ON TIME'}
                </span>
              </div>
            </div>

            {/* Next Stop Highlight Banner */}
            {nextStop && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.08)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                padding: '1rem 1.25rem',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                alignItems: 'center',
                marginBottom: '1.75rem'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    NEXT ARRIVAL STATION
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <MapPin size={18} color="#38bdf8" />
                    {nextStop.station_name} <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>({nextStop.station_code})</span>
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ESTIMATED TIME OF ARRIVAL
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <Clock size={18} />
                    {nextStop.dynamic_eta || nextStop.scheduled_arrival || '--:--'}
                    {nextStop.predicted_delay_minutes > 0 && (
                      <span style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600 }}>
                        (+{Math.round(nextStop.predicted_delay_minutes)}m delay)
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    CURRENT SPEED
                  </div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }}>
                    <Gauge size={18} color="#10b981" />
                    {selectedTrain.current_speed_kmh ? `${Math.round(selectedTrain.current_speed_kmh)} km/h` : 'In Transit'}
                  </div>
                </div>
              </div>
            )}

            {/* Visual Route Progress Track */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                  <strong>{trainDetail?.route?.[0]?.station_name || 'Origin'}</strong>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <strong>{trainDetail?.route?.[trainDetail.route.length - 1]?.station_name || 'Destination'}</strong>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--brand-primary)' }} />
                </div>
              </div>

              {/* Animated Progress Track Bar */}
              <div style={{
                position: 'relative',
                height: '10px',
                background: 'rgba(255, 255, 255, 0.15)',
                borderRadius: '9999px',
                overflow: 'visible'
              }}>
                <div style={{
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: 'linear-gradient(90deg, #38bdf8, #0284c7)',
                  borderRadius: '9999px',
                  transition: 'width 0.8s ease'
                }} />
                {/* Moving Train Indicator Pin */}
                <div style={{
                  position: 'absolute',
                  left: `calc(${progressPercent}% - 14px)`,
                  top: '-9px',
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 12px rgba(56, 189, 248, 0.8)',
                  transition: 'left 0.8s ease'
                }}>
                  <Train size={15} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                <span>Route Progress: {progressPercent}%</span>
                <span>{selectedTrain.current_station ? `Passed ${selectedTrain.current_station}` : 'En Route'}</span>
              </div>
            </div>
          </div>

          {/* Passenger Advisory Warning (if any disruption on track) */}
          {relevantAlerts.length > 0 && (
            <div style={{
              background: '#fffbeb',
              border: '1px solid #fef3c7',
              borderRadius: '12px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.85rem'
            }}>
              <AlertTriangle size={20} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ color: '#92400e', fontSize: '0.92rem', marginBottom: '0.2rem' }}>
                  Live Passenger Travel Advisory
                </h4>
                {relevantAlerts.map((alt, i) => (
                  <p key={i} style={{ fontSize: '0.84rem', color: '#b45309', margin: '0.2rem 0' }}>
                    {alt.message || `Operational speed regulation active along ${alt.section_id}`}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Vertical Station Journey Timeline */}
          <div className="transit-card" style={{ padding: '1.5rem' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '0.85rem',
              marginBottom: '1.25rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: '#0f172a', margin: 0 }}>
                  Station-by-Station Journey Timeline
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                  Real-time predicted arrivals powered by dynamic railway ETA model
                </p>
              </div>

              <button
                onClick={() => setShowAllStops(!showAllStops)}
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  padding: '0.35rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  color: '#475569',
                  cursor: 'pointer',
                  fontWeight: 600
                }}
              >
                {showAllStops ? 'Show All Stops' : 'Show Key Junctions'}
              </button>
            </div>

            {/* Timeline List */}
            <div style={{ position: 'relative', paddingLeft: '1.5rem' }}>
              {/* Vertical connecting spine line */}
              <div style={{
                position: 'absolute',
                left: '23px',
                top: '12px',
                bottom: '16px',
                width: '3px',
                background: '#e2e8f0',
                borderRadius: '9999px'
              }} />

              {upcomingStops.map((stop, idx) => {
                const isCompleted = stop.is_completed;
                const isNext = !isCompleted && upcomingStops.slice(0, idx).every((s) => s.is_completed);
                const delay = stop.predicted_delay_minutes || 0;

                return (
                  <div
                    key={stop.station_code || idx}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '1.25rem',
                      paddingBottom: idx === upcomingStops.length - 1 ? '0' : '1.5rem',
                      opacity: isCompleted ? 0.6 : 1
                    }}
                  >
                    {/* Node Dot Icon */}
                    <div style={{
                      position: 'relative',
                      zIndex: 2,
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isCompleted
                        ? '#cbd5e1'
                        : isNext
                        ? 'var(--brand-primary)'
                        : '#ffffff',
                      border: isNext
                        ? '3px solid #e0f2fe'
                        : '2px solid #94a3b8',
                      boxShadow: isNext ? '0 0 10px rgba(2, 132, 199, 0.4)' : 'none',
                      flexShrink: 0
                    }}>
                      {isCompleted ? (
                        <CheckCircle2 size={13} color="#ffffff" />
                      ) : isNext ? (
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff' }} />
                      ) : (
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#94a3b8' }} />
                      )}
                    </div>

                    {/* Station Info Row */}
                    <div style={{
                      flex: 1,
                      background: isNext ? '#f0f9ff' : 'transparent',
                      border: isNext ? '1px solid #bae6fd' : '1px solid transparent',
                      borderRadius: '10px',
                      padding: isNext ? '0.75rem 1rem' : '0.2rem 0',
                      display: 'flex',
                      flexWrap: 'wrap',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                          <span style={{
                            fontWeight: 700,
                            fontSize: '0.98rem',
                            color: isNext ? '#0369a1' : '#1e293b'
                          }}>
                            {stop.station_name}
                          </span>
                          <span style={{
                            fontSize: '0.75rem',
                            color: '#64748b',
                            fontFamily: 'var(--font-mono)',
                            background: '#f1f5f9',
                            padding: '0.1rem 0.35rem',
                            borderRadius: '4px'
                          }}>
                            {stop.station_code}
                          </span>
                          {isNext && (
                            <span style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              background: '#0284c7',
                              color: '#ffffff',
                              padding: '0.15rem 0.45rem',
                              borderRadius: '9999px',
                              textTransform: 'uppercase'
                            }}>
                              Next Stop
                            </span>
                          )}
                          {isCompleted && (
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              (Passed)
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                          Scheduled: <strong>{stop.scheduled_arrival || stop.scheduled_departure || '--:--'}</strong>
                        </div>
                      </div>

                      {/* Right: Predicted ETA & Delay Tag */}
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '1.05rem',
                          fontWeight: 700,
                          color: isCompleted ? '#64748b' : isNext ? '#0284c7' : '#0f172a'
                        }}>
                          {isCompleted ? stop.scheduled_arrival : (stop.dynamic_eta || stop.scheduled_arrival || '--:--')}
                        </div>

                        {!isCompleted && (
                          <div style={{ marginTop: '0.15rem' }}>
                            {delay > 0 ? (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: delay > 15 ? '#b91c1c' : '#b45309',
                                background: delay > 15 ? '#fee2e2' : '#fef3c7',
                                padding: '0.1rem 0.45rem',
                                borderRadius: '9999px'
                              }}>
                                +{delay.toFixed(0)} min delay
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                color: '#047857',
                                background: '#d1fae5',
                                padding: '0.1rem 0.45rem',
                                borderRadius: '9999px'
                              }}>
                                On Time
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div className="transit-card" style={{ textAlign: 'center', padding: '3rem 1rem' }}>
          <Train size={48} color="#94a3b8" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#475569', marginBottom: '0.5rem' }}>No Train Selected</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
            Please select a train from the list above to view live arrival times and route timeline.
          </p>
        </div>
      )}
    </div>
  );
}
