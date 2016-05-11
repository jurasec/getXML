var winston = require('winston');

var logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ 
        level: 'info',
        colorize: true
      }),
    new winston.transports.DailyRotateFile({
        name: 'file',
        datePattern: '.yyyy-MM-dd',
        filename: './logs/log_file.log',
        level: 'debug',
        handleExceptions: true,
        humanReadableUnhandledException: true
      })
  ]
});

logger.exitOnError = true;
logger.level = 'debug';

module.exports = logger;
