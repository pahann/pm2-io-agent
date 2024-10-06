const { logger } = require('./logger');

let bytesPerSecond = [];
let requestCount = 0;
let totalBytesIn = 0;
let totalBytesOut = 0;

function initStats() {
  setInterval(logStats, 30000);
  setInterval(calculateBytesPerSecond, 1000);
}

function updateStats(inBytes, outBytes) {
  totalBytesIn += inBytes;
  totalBytesOut += outBytes;
  requestCount++;
}

function calculateStats(data) {
  const sorted = [...data].sort((a, b) => a - b);
  const min = sorted[0] || 0;
  const max = sorted[sorted.length - 1] || 0;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const avg = sum / sorted.length || 0;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  return { min, max, avg, median };
}

function logStats() {
  const stats = calculateStats(bytesPerSecond);
  logger.info('Traffic Stats (last 30 seconds):', {
    timestamp: new Date().toISOString(),
    minBytesPerSecond: `${stats.min} bytes`,
    maxBytesPerSecond: `${stats.max} bytes`,
    avgBytesPerSecond: `${Math.round(stats.avg)} bytes`,
    medianBytesPerSecond: `${Math.round(stats.median)} bytes`,
    requestCount: requestCount
  });
  bytesPerSecond = [];
  requestCount = 0;
}

function calculateBytesPerSecond() {
  const totalBytes = totalBytesIn + totalBytesOut;
  bytesPerSecond.push(totalBytes);
  totalBytesIn = 0;
  totalBytesOut = 0;
}

module.exports = {
    initStats,
    updateStats,
}
