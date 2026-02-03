describe('Logger', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('honors instance debug levels when GLOBAL_DEBUG is undefined', () => {
    jest.doMock('../config', () => ({ GLOBAL_DEBUG: undefined }));

    jest.isolateModules(() => {
      const { default: Logger, DEBUG } = require('../utils/logger');

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

      const logger = new Logger(DEBUG.WARN, 'test');
      logger.log('a');
      logger.info('b');
      logger.warn('c');
      logger.error('d');

      expect(logSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledWith('[test]', 'c');
      expect(errorSpy).toHaveBeenCalledWith('[test]', 'd');
    });
  });

  it('overrides instance debug when GLOBAL_DEBUG is set', () => {
    jest.doMock('../config', () => ({ GLOBAL_DEBUG: 1 }));

    jest.isolateModules(() => {
      const { default: Logger, DEBUG } = require('../utils/logger');

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => undefined);
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

      const logger = new Logger(DEBUG.ERROR, 'test');
      logger.log('a');
      logger.info('b');
      logger.warn('c');

      expect(logSpy).not.toHaveBeenCalled();
      expect(infoSpy).toHaveBeenCalledWith('[test]', 'b');
      expect(warnSpy).toHaveBeenCalledWith('[test]', 'c');
    });
  });

  it('forceLog always writes and assert logs on failure', () => {
    jest.doMock('../config', () => ({ GLOBAL_DEBUG: 3 }));

    jest.isolateModules(() => {
      const { default: Logger, DEBUG } = require('../utils/logger');

      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

      const logger = new Logger(DEBUG.ERROR, 'test');
      logger.forceLog('forced');
      logger.assert(false, 'boom');
      logger.assert(true, 'nope');

      expect(logSpy).toHaveBeenNthCalledWith(1, '[test]', 'forced');
      expect(logSpy).toHaveBeenNthCalledWith(2, '[test]', 'Assertion failed:', 'boom');
      expect(logSpy).toHaveBeenCalledTimes(2);
    });
  });
});
