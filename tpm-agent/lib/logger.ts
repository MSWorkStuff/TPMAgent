type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function levelOrder(level: LogLevel): number {
  switch (level) {
    case 'debug': return 10;
    case 'info': return 20;
    case 'warn': return 30;
    case 'error': return 40;
  }
}

class Logger {
  private static instance: Logger;
  private isProduction: boolean;
  private minLevel: LogLevel;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
    const envLevel = (process.env.NEXT_PUBLIC_LOG_LEVEL || (this.isProduction ? 'error' : 'debug')) as LogLevel;
    this.minLevel = ['debug', 'info', 'warn', 'error'].includes(envLevel) ? envLevel : (this.isProduction ? 'error' : 'debug');
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private enabled(level: LogLevel): boolean {
    // In production, default to only error unless overridden via NEXT_PUBLIC_LOG_LEVEL
    return levelOrder(level) >= levelOrder(this.minLevel);
  }

  private format(prefix: string, message: string, data?: unknown): void {
    if (data !== undefined) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  public debug(message: string, data?: unknown): void {
    if (!this.enabled('debug')) return;
    const timestamp = new Date().toISOString();
    this.format(`[${timestamp}] [DEBUG]`, message, data);
  }

  public info(message: string, data?: unknown): void {
    if (!this.enabled('info')) return;
    const timestamp = new Date().toISOString();
    this.format(`[${timestamp}] [INFO]`, message, data);
  }

  public warn(message: string, data?: unknown): void {
    if (!this.enabled('warn')) return;
    const timestamp = new Date().toISOString();
    if (data !== undefined) {
      console.warn(`[${timestamp}] [WARN] ${message}`, data);
    } else {
      console.warn(`[${timestamp}] [WARN] ${message}`);
    }
  }

  public error(message: string, error?: unknown): void {
    if (!this.enabled('error')) return;
    const timestamp = new Date().toISOString();
    if (error !== undefined) {
      console.error(`[${timestamp}] [ERROR] ${message}`, error);
    } else {
      console.error(`[${timestamp}] [ERROR] ${message}`);
    }
  }
}

export const logger = Logger.getInstance();

