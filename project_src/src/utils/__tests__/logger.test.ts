import { Logger, LogLevel, createLogger } from '../logger';

// Mock console.log to capture output
const originalConsoleLog = console.log;
let capturedLogs: string[] = [];

beforeEach(() => {
  capturedLogs = [];
  console.log = jest.fn((message: string) => {
    capturedLogs.push(message);
  });
});

afterAll(() => {
  console.log = originalConsoleLog;
});

describe('Logger', () => {
  describe('log level filtering', () => {
    it('should filter out logs below the set level', () => {
      const logger = new Logger('test-service', LogLevel.WARN);
      
      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');
      
      expect(capturedLogs).toHaveLength(2);
      expect(capturedLogs[0]).toContain('warn message');
      expect(capturedLogs[1]).toContain('error message');
    });
  });

  describe('log format', () => {
    it('should create structured JSON logs', () => {
      const logger = new Logger('test-service', LogLevel.DEBUG);
      
      logger.info('test message', { key: 'value' });
      
      expect(capturedLogs).toHaveLength(1);
      const logEntry = JSON.parse(capturedLogs[0]);
      
      expect(logEntry).toHaveProperty('timestamp');
      expect(logEntry.level).toBe('INFO');
      expect(logEntry.service).toBe('test-service');
      expect(logEntry.message).toBe('test message');
      expect(logEntry.context).toEqual({ key: 'value' });
    });

    it('should not include context when not provided', () => {
      const logger = new Logger('test-service', LogLevel.DEBUG);
      
      logger.info('test message');
      
      const logEntry = JSON.parse(capturedLogs[0]);
      expect(logEntry).not.toHaveProperty('context');
    });
  });

  describe('createLogger factory', () => {
    it('should create logger with default INFO level', () => {
      const logger = createLogger('factory-test');
      
      logger.debug('should not appear');
      logger.info('should appear');
      
      expect(capturedLogs).toHaveLength(1);
      expect(capturedLogs[0]).toContain('should appear');
    });

    it('should create logger with custom level', () => {
      const logger = createLogger('factory-test', LogLevel.DEBUG);
      
      logger.debug('should appear');
      
      expect(capturedLogs).toHaveLength(1);
      expect(capturedLogs[0]).toContain('should appear');
    });
  });

  describe('setLevel', () => {
    it('should change log level dynamically', () => {
      const logger = new Logger('test-service', LogLevel.INFO);
      
      logger.debug('debug before');
      logger.setLevel(LogLevel.DEBUG);
      logger.debug('debug after');
      
      expect(capturedLogs).toHaveLength(1);
      expect(capturedLogs[0]).toContain('debug after');
    });
  });
});
