import React, { useEffect, useState } from "react";

import axios from "axios";

import { io } from "socket.io-client";

const API_URL = "http://localhost:5000";

function App() {

  const [data, setData] = useState({
    temperature: "--",
    ph: "--",
    tds: "--"
  });

  const [history, setHistory] = useState([]);

  const [alerts, setAlerts] = useState([]);

  const [prediction, setPrediction] = useState(null);

  const [connected, setConnected] = useState(false);

  // =========================
  // Load existing data
  // =========================

  useEffect(() => {

    loadHistory();
    loadAlerts();
    loadPrediction();

    const socket = io(API_URL);

    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("sensorData", newData => {

      setData({
        temperature: newData.temperature,
        ph: newData.ph,
        tds: newData.tds
      });

      loadHistory();
      loadAlerts();
      loadPrediction();
    });

    return () => {
      socket.disconnect();
    };

  }, []);

  // =========================
  // API functions
  // =========================

  async function loadHistory() {

    try {

      const response = await axios.get(
        `${API_URL}/api/readings?limit=20`
      );

      setHistory(response.data);

    } catch (error) {

      console.error(error);

    }
  }

  async function loadAlerts() {

    try {

      const response = await axios.get(
        `${API_URL}/api/alerts`
      );

      setAlerts(response.data);

    } catch (error) {

      console.error(error);

    }
  }

  async function loadPrediction() {

    try {

      const response = await axios.get(
        `${API_URL}/api/prediction`
      );

      setPrediction(response.data);

    } catch (error) {

      console.error(error);

    }
  }

  // =========================
  // UI
  // =========================

  return (

    <div className="app">

      <header>

        <div>
          <h1>Smart Aquatic Monitoring</h1>

          <p>
            IoT-Based Water Quality Monitoring System
          </p>
        </div>

        <div className={
          connected
            ? "status connected"
            : "status disconnected"
        }>
          {connected ? "● LIVE" : "● OFFLINE"}
        </div>

      </header>

      <main>

        {/* Sensor Cards */}

        <section className="cards">

          <SensorCard
            title="Temperature"
            value={data.temperature}
            unit="°C"
          />

          <SensorCard
            title="pH"
            value={data.ph}
            unit=""
          />

          <SensorCard
            title="TDS"
            value={data.tds}
            unit="ppm"
          />

        </section>

        {/* Current Status */}

        <section className="panel">

          <h2>Water Quality Status</h2>

          <div className="status-grid">

            <StatusItem
              name="Temperature"
              value={data.temperature}
              min={20}
              max={30}
            />

            <StatusItem
              name="pH"
              value={data.ph}
              min={6.5}
              max={8.5}
            />

            <StatusItem
              name="TDS"
              value={data.tds}
              min={50}
              max={300}
            />

          </div>

        </section>

        {/* Prediction */}

        <section className="panel">

          <h2>AI Trend Prediction</h2>

          {prediction ? (

            <div className="prediction">

              <div>
                <strong>Temperature</strong>
                <span>
                  {prediction.temperatureTrend || "--"}
                </span>
              </div>

              <div>
                <strong>pH</strong>
                <span>
                  {prediction.phTrend || "--"}
                </span>
              </div>

              <div>
                <strong>TDS</strong>
                <span>
                  {prediction.tdsTrend || "--"}
                </span>
              </div>

            </div>

          ) : (

            <p>Collecting historical data...</p>

          )}

        </section>

        {/* History */}

        <section className="panel">

          <h2>Historical Readings</h2>

          <div className="table-container">

            <table>

              <thead>

                <tr>
                  <th>Time</th>
                  <th>Temperature</th>
                  <th>pH</th>
                  <th>TDS</th>
                </tr>

              </thead>

              <tbody>

                {history.map(row => (

                  <tr key={row.id}>

                    <td>
                      {row.created_at}
                    </td>

                    <td>
                      {row.temperature} °C
                    </td>

                    <td>
                      {row.ph}
                    </td>

                    <td>
                      {row.tds} ppm
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>

        </section>

        {/* Alerts */}

        <section className="panel">

          <h2>Alerts</h2>

          {alerts.length === 0 ? (

            <p className="safe">
              No alerts detected.
            </p>

          ) : (

            <div>

              {alerts.map(alert => (

                <div
                  className="alert"
                  key={alert.id}
                >

                  <strong>
                    {alert.parameter}
                  </strong>

                  <span>
                    {alert.message}
                  </span>

                </div>

              ))}

            </div>

          )}

        </section>

      </main>

    </div>
  );
}

// =========================
// Sensor Card
// =========================

function SensorCard({
  title,
  value,
  unit
}) {

  return (

    <div className="sensor-card">

      <h3>{title}</h3>

      <div className="sensor-value">

        {value}

        <small>{unit}</small>

      </div>

      <span>Real-time reading</span>

    </div>
  );
}

// =========================
// Status Item
// =========================

function StatusItem({
  name,
  value,
  min,
  max
}) {

  const numericValue = Number(value);

  const valid =
    !isNaN(numericValue) &&
    numericValue >= min &&
    numericValue <= max;

  return (

    <div className="status-item">

      <div>

        <strong>{name}</strong>

        <span>
          {value}
        </span>

      </div>

      <b className={
        valid
          ? "safe"
          : "danger"
      }>

        {valid ? "Normal" : "Alert"}

      </b>

    </div>
  );
}

export default App;
