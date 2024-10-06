const http = require('node:http');
const { handleRequest } = require('./handlers');

function createServer(config) {
    return http.createServer((req, res) => handleRequest(req, res, config));
}

module.exports = { createServer };
