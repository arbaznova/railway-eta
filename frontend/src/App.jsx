import React, { useState, useEffect, useCallback } from 'react';
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

  // Load all initial data
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

      // Default selection fallback if 12002 not present
      if (tList && tList.length > 0 && !tList.some(t => t.train_number === selectedTrainNumber)) {
        setSelectedTrainNumber(tList[0].train_number);
      }
    } catch (err) {
      console.error('Error loading initial data', err);
    }
  }, [selectedTrainNumber]);

  // Load selected train details & ETA
  const loadTrainData = useCallback(async (trainNum) => {
    if (!trainNum) return;
    try {
      const [detail, eta] = await Promise.all([
        fetchTrainDetail(trainNum),
        fetchTrainETA(trainNum)
      ]);
      setTrainDetail(detail);
      setTrainETA(eta);
    } catch (err) {
      console.error(`Error loading train ${trainNum} data`, err);
    }
  }, []);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    loadTrainData(selectedTrainNumber);
  }, [selectedTrainNumber, loadTrainData]);

  // WebSocket setup
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
          // Refresh active train ETA and metrics
          loadTrainData(selectedTrainNumber);
          fetchAccuracyMetrics().then(setMetrics).catch(() => {});
          fetchAlerts().then(setAlerts).catch(() => {});
        }
      },
      (connected) => setIsWsConnected(connected)
    );

    return cleanup;
  }, [selectedTrainNumber, loadTrainData]);

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
      loadTrainData(selectedTrainNumber);
    }, 4000);

    return () => clearInterval(pollInterval);
  }, [selectedTrainNumber, loadTrainData]);

  // Simulation tick handler
  const handleTick = async (seconds = 60) => {
    setIsTicking(true);
    try {
      await stepSimulation(seconds);
      await loadInitialData();
      await loadTrainData(selectedTrainNumber);
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
      await loadTrainData(selectedTrainNumber);
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
        onSelectTrain={setSelectedTrainNumber}
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
            onSelectTrain={setSelectedTrainNumber}
            alerts={alerts}
          />
        ) : (
          <DispatcherCockpit
            trains={trains}
            selectedTrain={selectedTrain}
            onSelectTrain={setSelectedTrainNumber}
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
