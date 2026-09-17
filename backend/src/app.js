const express = require("express");
const pool = require("./db");
const authRoutes = require("./routes/authRoutes");
const serviceRoutes = require("./routes/serviceRoutes");
const capabilityRoutes = require("./routes/capabilityRoutes");
const connectionRoutes = require("./routes/connectionRoutes");
const workspaceRoutes = require("./routes/workspaceRoutes");

const app = express();

app.use(express.json());

app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      database: "connected",
    });
  } catch (error) {
    console.error("Health check failed:", error);

    res.status(500).json({
      status: "error",
      database: "disconnected",
    });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/workspaces", workspaceRoutes);
app.use("/api/workspaces", connectionRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/services", capabilityRoutes);

module.exports = app;