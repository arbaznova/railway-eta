import React, { useState, useMemo } from 'react';
import {
  Gauge, Clock, ArrowRight, Activity, AlertCircle, Search,
  SlidersHorizontal, Pin, PinOff, Lock, Unlock, ChevronLeft,
  ChevronRight, CheckCircle2, ShieldAlert, Sparkles, Filter, X
} from 'lucide-react';

export default function TrainRoster({ trains = [], selectedTrain, onSelectTrain }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'DELAYED' | 'ON_TIME'
  const [sortBy, setSortBy] = useState('NUMBER_ASC'); // 'NUMBER_ASC' | 'DELAY_DESC' | 'DELAY_ASC' | 'NAME_ASC' | 'SPEED_DESC'
  const [pinSelected, setPinSelected] = useState(false);
  const [isFrozen, setIsFrozen] = useState(false);

  // Counts for filter pills
  const delayedCount = useMemo(() => trains.filter(t => (t.current_delay_minutes || 0) > 0.5).length, [trains]);
  const onTimeCount = useMemo(() => trains.filter(t => (t.current_delay_minutes || 0) <= 0.5).length, [trains]);

  // Keep a stable ordered list of train IDs so telemetry updates do NOT shuffle cards around
  const [orderedTrainNumbers, setOrderedTrainNumbers] = useState([]);

  // Establish or re-sort train order only on explicit user filter/sort change or when fleet size changes
  useMemo(() => {
    if (isFrozen && orderedTrainNumbers.length > 0) return;
    if (!trains || trains.length === 0) return;

    let list = [...trains];

    // Filter by delay
    if (filterMode === 'DELAYED') {
      list = list.filter(t => (t.current_delay_minutes || 0) > 0.5);
    } else if (filterMode === 'ON_TIME') {
      list = list.filter(t => (t.current_delay_minutes || 0) <= 0.5);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(t =>
        t.train_number.toLowerCase().includes(q) ||
        t.train_name.toLowerCase().includes(q) ||
        t.origin.toLowerCase().includes(q) ||
        t.destination.toLowerCase().includes(q) ||
        t.train_type.toLowerCase().includes(q)
      );
    }

    // Deterministic Sort
    list.sort((a, b) => {
      if (pinSelected && selectedTrain) {
        if (a.train_number === selectedTrain.train_number) return -1;
        if (b.train_number === selectedTrain.train_number) return 1;
      }

      if (sortBy === 'NUMBER_ASC') {
        return a.train_number.localeCompare(b.train_number);
      }
      if (sortBy === 'DELAY_DESC') {
        return (b.current_delay_minutes || 0) - (a.current_delay_minutes || 0);
      }
      if (sortBy === 'DELAY_ASC') {
        return (a.current_delay_minutes || 0) - (b.current_delay_minutes || 0);
      }
      if (sortBy === 'NAME_ASC') {
        return a.train_name.localeCompare(b.train_name);
      }
      if (sortBy === 'SPEED_DESC') {
        return (b.speed_kmh || 0) - (a.speed_kmh || 0);
      }
      return a.train_number.localeCompare(b.train_number);
    });

    setOrderedTrainNumbers(list.map(t => t.train_number));
  }, [filterMode, searchTerm, sortBy, pinSelected, trains.length, isFrozen]);

  // Map latest live train telemetry into the stable slots
  const filteredTrains = useMemo(() => {
    const map = new Map(trains.map(t => [t.train_number, t]));
    const result = [];
    for (const num of orderedTrainNumbers) {
      const t = map.get(num);
      if (t) result.push(t);
    }
    // Fallback for any newly added trains
    for (const t of trains) {
      if (!orderedTrainNumbers.includes(t.train_number)) {
        result.push(t);
      }
    }
    return result;
  }, [trains, orderedTrainNumbers]);

  // Prev / Next train navigation helpers
  const currentIndex = trains.findIndex(t => t.train_number === selectedTrain?.train_number);
  const handlePrevTrain = () => {
    if (trains.length === 0) return;
    const prevIdx = (currentIndex - 1 + trains.length) % trains.length;
    onSelectTrain(trains[prevIdx].train_number);
  };

  const handleNextTrain = () => {
    if (trains.length === 0) return;
    const nextIdx = (currentIndex + 1) % trains.length;
    onSelectTrain(trains[nextIdx].train_number);
  };

  return (
    <aside style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.65rem',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Activity size={14} color="var(--hazard-yellow)" />
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '0.85rem' }}>
            TRAIN FLEET ({trains.length})
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <button
            onClick={() => setIsFrozen(!isFrozen)}
            title={isFrozen ? 'Roster layout is locked/frozen' : 'Live updates active'}
            style={{
              background: isFrozen ? 'var(--alert-red)' : 'var(--signal-green)',
              color: isFrozen ? '#ffffff' : '#000000',
              border: '1.5px solid #000000',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '0.15rem 0.4rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}
          >
            {isFrozen ? <Lock size={10} /> : <Unlock size={10} />}
            {isFrozen ? 'FREEZE' : 'LIVE'}
          </button>
        </div>
      </div>

      {/* 🎯 Sticky Hero Card: Currently Focused Train */}
      {selectedTrain && (
        <div style={{
          background: 'var(--hazard-yellow)',
          border: 'var(--border-width) solid var(--border-color)',
          boxShadow: 'var(--shadow-hard)',
          padding: '0.65rem 0.75rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.4rem'
        }}>
          {/* Focused Header & Quick Switcher */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 900,
              fontSize: '0.72rem',
              background: '#000000',
              color: '#ffffff',
              padding: '0.15rem 0.45rem'
            }}>
              <span>🎯 FOCUSED TARGET</span>
              <span style={{ color: 'var(--hazard-yellow)' }}>[{currentIndex + 1}/{trains.length}]</span>
            </div>

            {/* Quick Train Cycler */}
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              <button
                onClick={handlePrevTrain}
                title="Switch focus to previous train"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #000',
                  padding: '0.15rem 0.35rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 800
                }}
              >
                <ChevronLeft size={13} />
              </button>
              <button
                onClick={handleNextTrain}
                title="Switch focus to next train"
                style={{
                  background: '#ffffff',
                  border: '1.5px solid #000',
                  padding: '0.15rem 0.35rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  fontWeight: 800
                }}
              >
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          {/* Focused Train ID & Name */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 900,
              fontSize: '0.95rem',
              color: '#000000'
            }}>
              {selectedTrain.train_number} — {selectedTrain.train_name}
            </div>
          </div>

          {/* Route & Zone */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: '#111',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <strong>{selectedTrain.origin}</strong>
            <ArrowRight size={11} />
            <strong>{selectedTrain.destination}</strong>
            <span style={{ marginLeft: 'auto', fontWeight: 700 }}>({selectedTrain.zone})</span>
          </div>

          {/* Telemetry Bar */}
          <div style={{
            background: '#ffffff',
            border: '1.5px solid #000',
            padding: '0.3rem 0.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.72rem',
            fontFamily: 'var(--font-mono)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 800 }}>
              <Gauge size={12} />
              <span>{selectedTrain.speed_kmh ? `${selectedTrain.speed_kmh} km/h` : '80 km/h'}</span>
            </div>
            <div style={{ fontWeight: 800 }}>
              SEC: {selectedTrain.current_section_id || 'STATION'}
            </div>
            <div style={{
              background: (selectedTrain.current_delay_minutes || 0) > 15 ? 'var(--alert-red)' : (selectedTrain.current_delay_minutes || 0) > 5 ? 'var(--hazard-yellow)' : 'var(--signal-green)',
              color: (selectedTrain.current_delay_minutes || 0) > 15 ? '#ffffff' : '#000000',
              fontWeight: 900,
              padding: '0.1rem 0.35rem',
              border: '1px solid #000'
            }}>
              {(selectedTrain.current_delay_minutes || 0) > 0 ? `+${(selectedTrain.current_delay_minutes || 0).toFixed(1)}m` : 'ON TIME'}
            </div>
          </div>
        </div>
      )}

      {/* 🔍 Search & Focus Stability Controls */}
      <div style={{
        background: '#ffffff',
        border: 'var(--border-width) solid var(--border-color)',
        padding: '0.6rem',
        boxShadow: 'var(--shadow-hard-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        {/* Search Input with Clear Button */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Search size={13} style={{ position: 'absolute', left: '8px', color: '#666' }} />
          <input
            type="text"
            placeholder="Search train #, name, route..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '0.35rem 1.6rem 0.35rem 1.8rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              fontWeight: 700,
              border: '1.5px solid #000',
              background: '#faf8f5',
              outline: 'none'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute',
                right: '6px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#666'
              }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter Pills & Pin Selected Switch */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.3rem' }}>
          <div style={{ display: 'flex', gap: '0.25rem' }}>
            {[
              { id: 'ALL', label: `ALL (${trains.length})` },
              { id: 'DELAYED', label: `DELAY (${delayedCount})` },
              { id: 'ON_TIME', label: `ON-TIME (${onTimeCount})` }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterMode(f.id)}
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '0.2rem 0.4rem',
                  border: '1.5px solid #000',
                  background: filterMode === f.id ? '#000000' : '#ffffff',
                  color: filterMode === f.id ? '#ffffff' : '#000000',
                  cursor: 'pointer'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Pin Selected Toggle */}
          <button
            onClick={() => setPinSelected(!pinSelected)}
            title={pinSelected ? 'Focused train is pinned to top' : 'Pinned to top disabled'}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '0.2rem 0.4rem',
              border: '1.5px solid #000',
              background: pinSelected ? 'var(--electric-cyan)' : '#eeeeee',
              color: '#000000',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.2rem'
            }}
          >
            {pinSelected ? <Pin size={10} /> : <PinOff size={10} />}
            PIN
          </button>
        </div>

        {/* Sort Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', fontWeight: 800, color: '#555', whiteSpace: 'nowrap' }}>
            SORT:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
              width: '100%',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              fontWeight: 800,
              padding: '0.2rem 0.35rem',
              border: '1.5px solid #000',
              background: '#ffffff',
              cursor: 'pointer'
            }}
          >
            <option value="NUMBER_ASC">Fixed: Train # (Stable)</option>
            <option value="DELAY_DESC">Highest Delay First</option>
            <option value="DELAY_ASC">Lowest Delay / On Time</option>
            <option value="NAME_ASC">Train Name (A - Z)</option>
            <option value="SPEED_DESC">Speed (High - Low)</option>
          </select>
        </div>
      </div>

      {/* Train Cards List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
        {filteredTrains.length === 0 ? (
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.75rem',
            color: '#666',
            padding: '1.5rem 1rem',
            textAlign: 'center',
            background: '#ffffff',
            border: '1.5px dashed #000'
          }}>
            [NO TRAINS MATCH CURRENT FILTER]
          </div>
        ) : (
          filteredTrains.map((train) => {
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
                  border: isSelected ? '2.5px solid #000000' : 'var(--border-width) solid var(--border-color)',
                  boxShadow: isSelected ? 'var(--shadow-hard-lg)' : 'var(--shadow-hard-sm)',
                  transform: isSelected ? 'translate(-2px, -2px)' : 'none',
                  padding: '0.65rem 0.75rem',
                  cursor: 'pointer',
                  transition: 'background 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease',
                  position: 'relative'
                }}
              >
                {/* Selected Indicator Left Bar */}
                {isSelected && (
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    width: '6px',
                    background: 'var(--hazard-yellow)',
                    borderRight: '1.5px solid #000000'
                  }} />
                )}

                {/* Card Top: Number, Type, Delay Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span style={{
                      background: isSelected ? '#000000' : '#222222',
                      color: isSelected ? 'var(--hazard-yellow)' : '#ffffff',
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 900,
                      fontSize: '0.82rem',
                      padding: '0.15rem 0.45rem',
                      border: '1px solid #000'
                    }}>
                      {train.train_number}
                    </span>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      border: '1px solid #000',
                      padding: '0.15rem 0.35rem',
                      background: '#eeeeee'
                    }}>
                      {train.train_type}
                    </span>
                    {isSelected && (
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.6rem',
                        fontWeight: 900,
                        background: 'var(--hazard-yellow)',
                        color: '#000000',
                        border: '1px solid #000',
                        padding: '0.1rem 0.3rem'
                      }}>
                        FOCUS
                      </span>
                    )}
                  </div>

                  {/* Delay Badge */}
                  <div style={{
                    background: delayColor,
                    color: delayTextColor,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    fontWeight: 900,
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
                  fontSize: '0.85rem',
                  fontFamily: 'var(--font-display)',
                  marginBottom: '0.3rem',
                  color: '#000000',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {train.train_name}
                </div>

                {/* Origin -> Destination Route */}
                <div style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.7rem',
                  color: '#555',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  marginBottom: '0.4rem'
                }}>
                  <span>{train.origin}</span>
                  <ArrowRight size={10} />
                  <span>{train.destination}</span>
                  <span style={{ marginLeft: 'auto', color: '#777' }}>({train.zone})</span>
                </div>

                {/* Progress & Speed Telemetry */}
                <div style={{
                  background: '#f5f3ee',
                  border: '1.5px solid #000',
                  padding: '0.3rem 0.5rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.7rem',
                  fontFamily: 'var(--font-mono)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Gauge size={11} />
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
                    background: isSelected ? 'var(--hazard-yellow)' : '#333333',
                    borderRight: '1px solid #000'
                  }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
