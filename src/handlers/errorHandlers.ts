import { ErrorRequestHandler } from 'express';
import Logger, { DEBUG } from '../utils/logger';

const logger = new Logger(DEBUG.WARN, '/handlers/errorHandlers');

export const defaultErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).send('Internal server error');
};

export const spotifyErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  if (!(err.message as string).includes("Spotify's Web API")) {
    next(err);
  } else {
    logger.warn('Got Spotify Error:', err);
    if (err?.body?.error && err.body.error.status && err.body.error.message) {
      res.status(err.body.error.status).send(err.body.error.message);
    } else {
      logger.error('Got Spotify Error with unknown format');
      res.status(500).send('There was an unknown error.');
    }
  }
};
