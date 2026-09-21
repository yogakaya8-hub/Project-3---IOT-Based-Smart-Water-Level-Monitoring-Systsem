const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*"
  }
});

app.use(cors());
app.use(express.json());

// =========================
// Database
// =========================

const db = new sqlite3.Database("./aquatic.db");

db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS readings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      temperature REAL,
      ph REAL,
      tds REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      parameter TEXT,
      value REAL,
      message TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// =========================
// Thresholds
// =========================

const thresholds = {
  temperature: {
    min: 20,
    max: 30
  },

  ph: {
    min: 6.5,
    max: 8.5
  },

  tds: {
    min: 50,
    max: 300
  }
};

// =========================
// Check thresholds
// =========================

function checkThresholds(data) {

  const alerts = [];

  if (
    data.temperature < thresholds.temperature.min ||
    data.temperature > thresholds.temperature.max
  ) {
    alerts.push({
      parameter: "temperature",
      value: data.temperature,
      message: "Temperature is outside the configured range."
    });
  }

  if (
    data.ph < thresholds.ph.min ||
    data.ph > thresholds.ph.max
  ) {
    alerts.push({
      parameter: "pH",
      value: data.ph,
      message: "pH is outside the configured range."
    });
  }

  if (
    data.tds < thresholds.tds.min ||
    data.tds > thresholds.tds.max
  ) {
    alerts.push({
      parameter: "TDS",
      value: data.tds,
      message: "TDS is outside the configured range."
    });
  }

  return alerts;
}

// =========================
// Receive sensor data
// =========================

app.post("/api/readings", (req, res) => {

  const {
    temperature,
    ph,
    tds
  } = req.body;

  if (
    temperature === undefined ||
    ph === undefined ||
    tds === undefined
  ) {
    return res.status(400).json({
      error: "Temperature, pH and TDS are required."
    });
  }

  const data = {
    temperature: Number(temperature),
    ph: Number(ph),
    tds: Number(tds)
  };

  db.run(
    `
    INSERT INTO readings
    (temperature, ph, tds)
    VALUES (?, ?, ?)
    `,
    [
      data.temperature,
      data.ph,
      data.tds
    ],
    function (err) {

      if (err) {
        return res.status(500).json({
          error: err.message
        });
      }

      const alerts = checkThresholds(data);

      alerts.forEach(alert => {

        db.run(
          `
          INSERT INTO alerts
          (parameter, value, message)
          VALUES (?, ?, ?)
          `,
          [
            alert.parameter,
            alert.value,
            alert.message
          ]
        );
      });

      // Send live data to dashboard
      io.emit("sensorData", {
        ...data,
        alerts,
        timestamp: new Date()
      });

      res.json({
        success: true,
        data,
        alerts
      });
    }
  );
});

// =========================
// Get latest reading
// =========================

app.get("/api/readings/latest", (req, res) => {

  db.get(
    `
    SELECT *
    FROM readings
    ORDER BY id DESC
    LIMIT 1
    `,
    (err, row) => {

      if (err) {
        return res.status(500).json({
          error: err.message
        });
      }

      res.json(row || null);
    }
  );
});

// =========================
// Get historical readings
// =========================

app.get("/api/readings", (req, res) => {

  const limit = Number(req.query.limit) || 50;

  db.all(
    `
    SELECT *
    FROM readings
    ORDER BY id DESC
    LIMIT ?
    `,
    [limit],
    (err, rows) => {

      if (err) {
        return res.status(500).json({
          error: err.message
        });
      }

      res.json(rows);
    }
  );
});

// =========================
// Get alerts
// =========================

app.get("/api/alerts", (req, res) => {

  db.all(
    `
    SELECT *
    FROM alerts
    ORDER BY id DESC
    LIMIT 50
    `,
    (err, rows) => {

      if (err) {
        return res.status(500).json({
          error: err.message
        });
      }

      res.json(rows);
    }
  );
});

// =========================
// Basic prediction
// =========================

app.get("/api/prediction", (req, res) => {

  db.all(
    `
    SELECT temperature, ph, tds
    FROM readings
    ORDER BY id DESC
    LIMIT 10
    `,
    (err, rows) => {

      if (err) {
        return res.status(500).json({
          error: err.message
        });
      }

      if (rows.length < 2) {
        return res.json({
          message: "Not enough historical data for prediction."
        });
      }

      const latest = rows[0];
      const oldest = rows[rows.length - 1];

      const prediction = {
        temperatureTrend:
          latest.temperature > oldest.temperature
            ? "Increasing"
            : latest.temperature < oldest.temperature
            ? "Decreasing"
            : "Stable",

        phTrend:
          latest.ph > oldest.ph
            ? "Increasing"
            : latest.ph < oldest.ph
            ? "Decreasing"
            : "Stable",

        tdsTrend:
          latest.tds > oldest.tds
            ? "Increasing"
            : latest.tds < oldest.tds
            ? "Decreasing"
            : "Stable"
      };

      res.json(prediction);
    }
  );
});

// =========================
// WebSocket connection
// =========================

io.on("connection", socket => {

  console.log("Dashboard connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Dashboard disconnected:", socket.id);
  });

});

// =========================
// Start server
// =========================

const PORT = 5000;

server.listen(PORT, () => {

  console.log(`
====================================
Smart Aquatic Monitoring Backend
====================================

Server running on:
http://localhost:${PORT}

API:
POST /api/readings
GET  /api/readings
GET  /api/readings/latest
GET  /api/alerts
GET  /api/prediction

  `);
});
