'use strict';

const { createRequestHandler } = require('../backend/server');
const handler = createRequestHandler({ inMemory: true });

module.exports = handler;
