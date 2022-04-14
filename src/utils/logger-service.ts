import winston, { createLogger, format, transports } from 'winston';

const logger = createLogger({
  levels: winston.config.syslog.levels,
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.splat(),
    format.json(),
  ),
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf((info) => `${info['timestamp']} ${info.level}: ${info.message}`),
      ),
      level: 'debug',
    }),
  ],
});

winston.add(logger);
export default winston;
