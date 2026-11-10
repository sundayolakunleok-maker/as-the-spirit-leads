'use strict';
// Vercel serverless entry point. Wraps the existing Node HTTP handler so the
// same routing, views and API run unchanged on Vercel.
const { handle } = require('../server');

module.exports = (req, res) => handle(req, res);
