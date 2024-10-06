const { createServer } = require('./server');
const { logger } = require('./logger');
const { initStats } = require('./stats');

let server = null;

function validateConfig(config) {
  if (!config || typeof config !== 'object') {
    throw new Error('Oops! The configuration seems to be on vacation.');
  }

  if (!config.sourcePort || !config.targetEndpoint) {
    throw new Error('Hey! The configuration is missing some important bits.');
  }
}

async function startProxy(config) {
  if (server) {
    logger.info('The proxy server is already up and running.');
    return server;
  }

  validateConfig(config);

  if (config.enableStats) {
    try {
      initStats();
    } catch (error) {
      logger.error('Stats initialization failed:', error);
      throw error;
    }
  }

  server = createServer(config);

  return new Promise((resolve, reject) => {
    server.listen(config.sourcePort, 'localhost', () => {
      logger.info(`Proxy server started on http://localhost:${config.sourcePort}, forwarding to ${config.targetEndpoint}`);
      logger.info(config.enableStats ? 'Stats logging enabled' : 'Stats logging disabled');
      resolve(server);
    });

    server.on('error', (error) => {
      server = null;
      logger.error('Server error:', {
        error: error.message,
        stack: error.stack,
        port: config.sourcePort
      });
      reject(error);
    });
  });
}

async function stopProxy() {
  if (!server) {
    logger.warn('No server to stop.');
    return;
  }

  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        logger.error('Error stopping the proxy:', err);
        reject(err);
      } else {
        server = null;
        logger.info('Proxy stopped successfully.');
        resolve();
      }
    });
  });
}

module.exports = {
  startProxy,
  stopProxy
};
