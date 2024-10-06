const { parse } = require('node:url');
const net = require('node:net');
const http = require('node:http');
const { logger } = require('./logger');
const { updateStats } = require('./stats');
const { parseEndpoint } = require('./config');

function handleRequest(sreq, sres, config) {
  const { pathname, search } = parse(sreq.url);
  let requestBody = '';
  let requestSize = 0;
  const startTime = process.hrtime();

  logger.info('Incoming Request:', {
    timestamp: new Date().toISOString(),
    method: sreq.method,
    url: sreq.url,
    headers: sreq.headers,
    remoteAddress: sreq.socket.remoteAddress,
    remotePort: sreq.socket.remotePort
  });

  sreq.headers['custom-tenant'] = 'XXX'

  if (sreq.headers['content-type'] === 'application/x-protobuf') {
    handleProtobufRequest(sreq, sres, config);
    return;
  }

  sreq.on('data', (chunk) => {
    requestSize += chunk.length;
    updateStats(chunk.length, 0);
    requestBody += chunk.toString('hex').slice(0, 200);
  });

  sreq.on('end', () => {
    logger.info('Request Body Preview:', {
      preview: requestBody,
      size: `${requestSize} bytes`
    });
  });

  const opts = {
    protocol: config.targetProtocol,
    hostname: config.targetHost,
    port: config.targetPort,
    path: pathname + (search || ''),
    method: sreq.method,
    headers: {
      ...sreq.headers,
      host: `${config.targetHost}:${config.targetPort}`,
    },
  }

  const creq = http.request(opts, (cres) => {
    let responseBody = '';
    let responseSize = 0;

    cres.on('data', (chunk) => {
      responseSize += chunk.length;
      updateStats(0, chunk.length);
      responseBody += chunk.toString('hex').slice(0, 200);
    });

    cres.on('end', () => {
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const duration = seconds * 1000 + nanoseconds / 1e6;
      logger.info('Outgoing Response:', {
        timestamp: new Date().toISOString(),
        method: sreq.method,
        url: sreq.url,
        status: cres.statusCode,
        headers: cres.headers,
        duration: `${duration.toFixed(2)}ms`,
        responseBodyPreview: responseBody,
        requestSize: `${requestSize} bytes`,
        responseSize: `${responseSize} bytes`
      });
    });

    sres.writeHead(cres.statusCode, cres.headers);
    cres.pipe(sres);
  });

  creq.on('error', (error) => {
    logger.error('Proxy request error:', {
      error: error.message,
      stack: error.stack,
      method: sreq.method,
      url: sreq.url,
      headers: sreq.headers,
      bodyPreview: requestBody,
      requestSize: `${requestSize} bytes`,
      targetOptions: opts
    });
    sres.statusCode = 502;
    sres.end('Bad Gateway');
  });

  sreq.pipe(creq);
}

function handleProtobufRequest(sreq, sres, config) {
  let requestSize = 0;
  let responseSize = 0;
  const startTime = process.hrtime();

  logger.info('Incoming Protobuf Request:', {
    config,
    timestamp: new Date().toISOString(),
    method: sreq.method,
    url: sreq.url,
    headers: sreq.headers,
    remoteAddress: sreq.socket.remoteAddress,
    remotePort: sreq.socket.remotePort
  });

  const { hostname, port } = parseEndpoint(config.targetEndpoint);

  const client = new net.Socket();
  client.connect(port, hostname, () => {
    logger.info('TCP connection established for protobuf request');
  });

  sreq.on('data', (chunk) => {
    requestSize += chunk.length;
    updateStats(chunk.length, 0);
    client.write(chunk);
  });

  client.on('data', (data) => {
    responseSize += data.length;
    updateStats(0, data.length);
    sres.write(data);
  });

  client.on('end', () => {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const duration = seconds * 1000 + nanoseconds / 1e6;

    logger.info('Outgoing Protobuf Response:', {
      timestamp: new Date().toISOString(),
      method: sreq.method,
      url: sreq.url,
      duration: `${duration.toFixed(2)}ms`,
      requestSize: `${requestSize} bytes`,
      responseSize: `${responseSize} bytes`
    });

    sres.end();
    logger.info('TCP connection closed for protobuf request');
  });

  client.on('error', (error) => {
    logger.error('TCP connection error:', {
      error: error.message,
      stack: error.stack,
      method: sreq.method,
      url: sreq.url,
      headers: sreq.headers,
      requestSize: `${requestSize} bytes`,
      hostname,
      port
    });
    sres.statusCode = 502;
    sres.end('Bad Gateway');
  });

  sreq.on('end', () => {
    client.end();
  });
}

module.exports = { handleRequest };
