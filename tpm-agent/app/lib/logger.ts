type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private static instance: Logger;
  private isProduction: boolean;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(): boolean {
    return !this.isProduction;
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): void {
    if (!this.shouldLog()) return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data !== undefined) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  public debug(message: string, data?: unknown): void {
    this.formatMessage('debug', message, data);
  }

  public info(message: string, data?: unknown): void {
    this.formatMessage('info', message, data);
  }

  public warn(message: string, data?: unknown): void {
    if (!this.shouldLog()) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [WARN]`;
    
    if (data !== undefined) {
      console.warn(`${prefix} ${message}`, data);
    } else {
      console.warn(`${prefix} ${message}`);
    }
  }

  public error(message: string, error?: unknown): void {
    if (!this.shouldLog()) return;
    
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [ERROR]`;
    
    if (error !== undefined) {
      console.error(`${prefix} ${message}`, error);
    } else {
      console.error(`${prefix} ${message}`);
    }
  }
}

export const logger = Logger.getInstance();
