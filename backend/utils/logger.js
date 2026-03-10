const pino = require('pino');

const isDev = (process.env.NODE_ENV || 'development') === 'development';
const usePretty = isDev && !process.env.VERCEL;

// Create Pino Logger Instance
const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    ...(usePretty
        ? {
              transport: {
                  target: 'pino-pretty',
                  options: {
                      colorize: true,
                      translateTime: 'SYS:standard',
                      ignore: 'pid,hostname',
                  },
              },
          }
        : {}),
});

module.exports = {
    info: (msg, meta) => logger.info(meta || {}, msg),
    error: (msg, meta) => logger.error(meta || {}, msg),
    warn: (msg, meta) => logger.warn(meta || {}, msg),
    debug: (msg, meta) => logger.debug(meta || {}, msg),
    fatal: (msg, meta) => logger.fatal(meta || {}, msg),
};
