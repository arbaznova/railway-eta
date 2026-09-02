import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import TrainRoster from './components/TrainRoster';
import CorridorMap from './components/CorridorMap';
import EtaMatrix from './components/EtaMatrix';
import EventInjector from './components/EventInjector';
import AlertsPanel from './components/AlertsPanel';
import AccuracyScoreboard from './components/AccuracyScoreboard';
import {
  fetchTrains, fetchTrainDetail, fetchTrainETA, fetchSections,
  fetchAlerts, fetchAccuracyMetrics, injectDisruption, stepSimulation,
  resetSimulation, createWebSocketConnection
} from './services/api';

export default function App() {
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

  // Load all initial data
  const loadInitialData = useCallback(async () => {
    try {
      const [tList, secList, altList, metList] = await Promise.all([
        fetchTrains(),
        fetchSections(),
        fetchAlerts(),
        fetchAccuracyMetrics()
      ]);
      setTrains(tList);
      setSections(secList);
      setAlerts(altList);
      setMetrics(metList);
    } catch (err) {
      console.error('Error loading initial data', err);
    }
  }, []);

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
          // Merge updates into train states
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

  // Periodic polling fallback (every 4s)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchTrains().then(setTrains).catch(() => {});
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

  // Reset simulation handler
  const handleReset = async () => {
    if (!window.confirm('Reset all train positions and clear active operational disruptions?')) return;
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
      // Immediately refresh sections, alerts, and ETA
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
      {/* Top HUD Header */}
      <Header
        isConnected={isWsConnected}
        onTick={handleTick}
        onReset={handleReset}
        isTicking={isTicking}
      />

      {/* Main Operational Command Grid */}
      <main style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '320px 1fr 340px',
        gap: '1rem',
        padding: '1rem 1.25rem',
        overflow: 'hidden'
      }}>
        {/* Left: Active Train Roster */}
        <section style={{ height: 'calc(100vh - 150px)', overflowY: 'auto' }}>
          <TrainRoster
            trains={trains}
            selectedTrain={selectedTrain}
            onSelectTrain={setSelectedTrainNumber}
          />
        </section>

        {/* Center: Track Topology & Station ETA Matrix */}
        <section style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          height: 'calc(100vh - 150px)',
          overflowY: 'auto'
        }}>
          {/* Corridor Topology Schematic */}
          <CorridorMap
            trainDetail={trainDetail}
            trainState={selectedTrain}
            sections={sections}
          />

          {/* Station-by-Station ETA Prediction Matrix */}
          <EtaMatrix
            etaData={trainETA}
            trainDetail={trainDetail}
          />
        </section>

        {/* Right: Simulation Disruption Console & Alerts Feed */}
        <section style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          height: 'calc(100vh - 150px)',
          overflowY: 'auto'
        }}>
          <EventInjector
            sections={sections}
            onInjectEvent={handleInjectEvent}
            isInjecting={isInjecting}
          />

          <AlertsPanel alerts={alerts} />
        </section>
      </main>

      {/* Bottom Accuracy & Evaluation Scoreboard */}
      <AccuracyScoreboard metrics={metrics} />
    </div>
  );
}
