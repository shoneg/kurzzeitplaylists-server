import Logger, { DEBUG } from '../utils/logger';

const logger = new Logger(DEBUG.WARN, '/db');

export const refreshAllSessions = () => {
  logger.log('start refreshing all sessions');
};
