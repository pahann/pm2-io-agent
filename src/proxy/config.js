const url = require('node:url');

const parseEndpoint = (endpoint) => {
  if (!endpoint) return { protocol: 'http:', hostname: 'localhost', port: '4617' };
  const parsed = new url.URL(endpoint);
  return {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? '443' : '80')
  };
};

const targetEndpoint = parseEndpoint(process.env.TARGET_ENDPOINT);

const config = {
  sourcePort: Number.parseInt(process.env.SOURCE_PORT || '4317', 10),
  targetEndpoint: process.env.TARGET_ENDPOINT || 'http://localhost:4617',
  targetProtocol: targetEndpoint.protocol,
  targetHost: targetEndpoint.hostname,
  targetPort: Number.parseInt(targetEndpoint.port, 10),
  enableStats: process.env.ENABLE_STATS === 'true',
};

module.exports = { config, parseEndpoint };
