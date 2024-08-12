// logger.js
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new DailyRotateFile({
      filename: 'logs/%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      zippedArchive: true,
    }),
  ],
});

const logMiddleware = (req, res, next) => {
  const start = Date.now();
  const originalEnd = res.end;
  const originalSend = res.send;

  res.end = (chunk, encoding, callback) => {
    const duration = Date.now() - start;
    const response = {
      status: res.statusCode,
      method: req.method,
      url: req.url,
      duration,
      data: chunk,
      userAgent: req.headers['user-agent'],
    };

    logger.info(response);
    originalEnd.call(res, chunk, encoding, callback);
  };

  res.send = (data) => {
    const duration = Date.now() - start;
    const response = {
      status: res.statusCode,
      method: req.method,
      url: req.url,
      duration,
      data,
      userAgent: req.headers['user-agent'],
    };

    logger.info(response);
    originalSend.call(res, data);
  };

  next();
};

module.exports = logMiddleware;
