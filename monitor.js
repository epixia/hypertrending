// monitor.js
const axios = require("axios");

const MONITOR_URL = process.env.MONITOR_URL || "http://localhost:3005/events";

async function send(payload) {
  try {
    await axios.post(MONITOR_URL, payload, { timeout: 2000 });
  } catch (err) {
    // don't crash app if monitor is down
    console.error("Monitor error:", err.message);
  }
}

async function startEvent({ project, agent, type, meta }) {
  const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  await send({ id, project, agent, phase: "start", type, meta });
  return id;
}

async function finishEvent(id, { project, agent, type, result, meta }) {
  await send({ id, project, agent, phase: "finish", type, result, meta });
}

async function errorEvent(id, { project, agent, type, error, meta }) {
  await send({
    id,
    project,
    agent,
    phase: "error",
    type,
    error: { message: error.message, stack: error.stack },
    meta,
  });
}

module.exports = { startEvent, finishEvent, errorEvent };
