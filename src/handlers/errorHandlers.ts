import { ErrorRequestHandler } from 'express';
import Logger, { DEBUG } from '../utils/logger';

const logger = new Logger(DEBUG.WARN, '/handlers/errorHandlers');

export const defaultErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).send('Internal server error');
};
