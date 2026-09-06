import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import PassengerView from './components/PassengerView';
import DispatcherCockpit from './components/DispatcherCockpit';
import {
  fetchTrains, fetchTrainDetail, fetchTrainETA, fetchSections,
  fetchAlerts, fetchAccuracyMetrics, injectDisruption, stepSimulation,
  resetSimulation, fetchSimulationStatus, pauseSimulation, resumeSimulation,
  createWebSocketConnection
} from './services/api';

export default function App() {
  const [activeMode, setActiveMode] = useState('passenger'); // 'passenger' (default) | 'dispatcher'
  const [trains, setTrains] = useState([]);
  const [selectedTrainNumber, setSelectedTrainNumber] = useState('12002');
  const [trainDetail, setTrainDetail] = useState(null);
  const [trainETA, setTrainETA] = useState(null);
  const [sections, setSections] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isTicking, setIsTicking] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [isSimPaused, setIsSimPaused] = useState(true);

  // Keep a ref to the selected train to prevent stale async callbacks from overwriting ETA
  const selectedTrainNumberRef = useRef(selectedTrainNumber);
  useEffect(() => {
    selectedTrainNumberRef.current = selectedTrainNumber;
  }, [selectedTrainNumber]);

  // Load selected train details & ETA with strict identity verification
  const loadTrainData = useCallback(async (trainNum) => {
    if (!trainNum) return;
    try {
      const [detail, eta] = await Promise.all([
        fetchTrainDetail(trainNum),
        fetchTrainETA(trainNum)
      ]);
      // Strict guard: only update state if this is STILL the user's selected train
      if (selectedTrainNumberRef.current === trainNum) {
        setTrainDetail(detail);
        setTrainETA(eta);
      }
    } catch (err) {
      console.error(`Error loading train ${trainNum} data`, err);
    }
  }, []);

  // Explicit user train selection handler - clears old ETA immediately to prevent showing previous train
  const handleSelectTrain = useCallback((trainNum) => {
    if (!trainNum || trainNum === selectedTrainNumberRef.current) return;
    setSelectedTrainNumber(trainNum);
    selectedTrainNumberRef.current = trainNum;
    setTrainDetail(null);
    setTrainETA(null);
    loadTrainData(trainNum);
  }, [loadTrainData]);

  // Load all initial data once on mount
  const loadInitialData = useCallback(async () => {
    try {
      const [tList, secList, altList, metList, simStatus] = await Promise.all([
        fetchTrains(),
        fetchSections(),
        fetchAlerts(),
        fetchAccuracyMetrics(),
        fetchSimulationStatus().catch(() => ({ is_paused: true }))
      ]);
      setTrains(tList);
      setSections(secList);
      setAlerts(altList);
      setMetrics(metList);
      if (simStatus && typeof simStatus.is_paused === 'boolean') {
        setIsSimPaused(simStatus.is_paused);
      }

      // Default selection fallback if 12002 not present only on initial load
      if (tList && tList.length > 0 && !tList.some(t => t.train_number === selectedTrainNumberRef.current)) {
        const defaultNum = tList[0].train_number;
        setSelectedTrainNumber(defaultNum);
        selectedTrainNumberRef.current = defaultNum;
        loadTrainData(defaultNum);
      }
    } catch (err) {
      console.error('Error loading initial data', err);
    }
  }, [loadTrainData]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadTrainData(selectedTrainNumber);
  }, [selectedTrainNumber, loadTrainData]);

  // WebSocket setup - updates active train ETA without re-binding connection on every train switch
  useEffect(() => {
    const cleanup = createWebSocketConnection(
      (msg) => {
        if (msg.type === 'TRAIN_UPDATES') {
          // Merge updates stably into train states preserving order
          setTrains((prevTrains) =>
            prevTrains.map((t) => {
              const update = msg.data.find((u) => u.train_number === t.train_number);
              return update ? { ...t, ...update } : t;
            })
          );
          // Refresh ONLY the currently selected train's ETA and global metrics
          loadTrainData(selectedTrainNumberRef.current);
          fetchAccuracyMetrics().then(setMetrics).catch(() => {});
          fetchAlerts().then(setAlerts).catch(() => {});
        }
      },
      (connected) => setIsWsConnected(connected)
    );

    return cleanup;
  }, [loadTrainData]);

  // Periodic polling fallback (every 4s) with stable order preservation
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchTrains().then((newList) => {
        setTrains((prevTrains) => {
          if (!prevTrains || prevTrains.length === 0) return newList;
          const map = new Map(newList.map(item => [item.train_number, item]));
          const updated = prevTrains.map(prev => map.get(prev.train_number) || prev);
          // Append any newly discovered trains
          newList.forEach(item => {
            if (!prevTrains.some(p => p.train_number === item.train_number)) {
              updated.push(item);
            }
          });
          return updated;
        });
      }).catch(() => {});
      fetchSections().then(setSections).catch(() => {});
      fetchAlerts().then(setAlerts).catch(() => {});
      fetchAccuracyMetrics().then(setMetrics).catch(() => {});
      loadTrainData(selectedTrainNumberRef.current);
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [loadTrainData]);

  // Simulation tick handler
  const handleTick = async (seconds = 60) => {
    setIsTicking(true);
    try {
      await stepSimulation(seconds);
      const [secList, altList] = await Promise.all([fetchSections(), fetchAlerts()]);
      setSections(secList);
      setAlerts(altList);
      await loadTrainData(selectedTrainNumberRef.current);
    } catch (err) {
      alert(`Simulation tick failed: ${err.message}`);
    } finally {
      setIsTicking(false);
    }
  };

  // Toggle Auto Simulation Run / Pause
  const handleTogglePlayPause = async () => {
    try {
      if (isSimPaused) {
        await resumeSimulation();
        setIsSimPaused(false);
      } else {
        await pauseSimulation();
        setIsSimPaused(true);
      }
    } catch (err) {
      alert(`Failed to toggle simulation state: ${err.message}`);
    }
  };

  // Reset simulation handler
  const handleReset = async () => {
    if (!window.confirm('Reset all train positions back to origin and clear active operational disruptions?')) return;
    try {
      await resetSimulation();
      await loadInitialData();
      await loadTrainData(selectedTrainNumber);
    } catch (err) {
      alert(`Reset failed: ${err.message}`);
    }
  };

  // Disruption injection handler
  const handleInjectEvent = async (eventType, sectionId, severity) => {
    setIsInjecting(true);
    try {
      await injectDisruption(eventType, sectionId, severity);
      const [secList, altList] = await Promise.all([fetchSections(), fetchAlerts()]);
      setSections(secList);
      setAlerts(altList);
      await loadTrainData(selectedTrainNumberRef.current);
    } finally {
      setIsInjecting(false);
    }
  };

  const selectedTrain = trains.find((t) => t.train_number === selectedTrainNumber);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh',
      background: 'var(--bg-canvas)'
    }}>
      {/* Top Header with Role Switcher */}
      <Header
        isConnected={isWsConnected}
        onTick={handleTick}
        onReset={handleReset}
        isTicking={isTicking}
        trains={trains}
        selectedTrain={selectedTrain}
        onSelectTrain={handleSelectTrain}
        isSimPaused={isSimPaused}
        onTogglePlayPause={handleTogglePlayPause}
        activeMode={activeMode}
        onChangeMode={setActiveMode}
      />

      {/* Main Viewport: Passenger Tracker vs Dispatcher Cockpit */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden'
      }}>
        {activeMode === 'passenger' ? (
          <PassengerView
            trains={trains}
            selectedTrain={selectedTrain}
            trainDetail={trainDetail}
            trainETA={trainETA}
            onSelectTrain={handleSelectTrain}
            alerts={alerts}
          />
        ) : (
          <DispatcherCockpit
            trains={trains}
            selectedTrain={selectedTrain}
            onSelectTrain={handleSelectTrain}
            trainDetail={trainDetail}
            trainETA={trainETA}
            sections={sections}
            alerts={alerts}
            metrics={metrics}
            onInjectEvent={handleInjectEvent}
            isInjecting={isInjecting}
          />
        )}
      </main>
    </div>
  );
}
