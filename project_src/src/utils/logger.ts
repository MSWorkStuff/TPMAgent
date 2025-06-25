/**
 * Simple structured logger utility
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LogContext {
  [key: string]: any;
}

export class Logger {
  private level: LogLevel;
  private serviceName: string;

  constructor(serviceName: string, level: LogLevel = LogLevel.INFO) {
    this.serviceName = serviceName;
    this.level = level;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    if (level < this.level) {
      return;
    }

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    
    const logEntry = {
      timestamp,
      level: levelName,
      service: this.serviceName,
      message,
      ...(context && { context }),
    };

    console.log(JSON.stringify(logEntry));
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  error(message: string, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context);
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }
}

export const createLogger = (serviceName: string, level?: LogLevel): Logger => {
  return new Logger(serviceName, level);
};
