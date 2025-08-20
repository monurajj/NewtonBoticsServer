const { v4: uuidv4 } = require('uuid');

// Adds a requestId and basic console logs for debugging
module.exports = (req, res, next) => {
  try {
    req.requestId = req.headers['x-request-id'] || uuidv4();
    res.setHeader('X-Request-Id', req.requestId);

    // High-resolution start time for precise latency
    const startHrTime = process.hrtime.bigint();
    req._startHrTime = startHrTime;

    console.log(`[REQ] id=${req.requestId} ${req.method} ${req.originalUrl}`);

    res.on('finish', () => {
      const endHrTime = process.hrtime.bigint();
      const durationMs = Number((endHrTime - startHrTime) / BigInt(1e6));
      const level = res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'OK';
      console.log(
        `[RES] id=${req.requestId} ${req.method} ${req.originalUrl} status=${res.statusCode} ${level} duration=${durationMs}ms`
      );
    });
  } catch (_) {
    // Do not block requests if logging middleware fails
  }

  next();
};


