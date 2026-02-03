import { ErrorRequestHandler } from 'express';
import Logger, { DEBUG } from '../utils/logger';

const logger = new Logger(DEBUG.WARN, '/handlers/errorHandlers');

/**
 * Fallback error handler for unexpected failures.
 */
export const defaultErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).send('Internal server error');
};

/**
 * Handle known authentication errors from the Spotify OAuth flow.
 */
export const authErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const m = err.message as string;
  if (!m || !(m.includes('login failed') || m.includes('registration failed') || m.includes('TokenError'))) {
    next(err);
  } else {
    logger.info('Spotify login failed for any reason:', err);
    if (m.includes('registration failed')) {
      res.status(401).send('Registration failed');
    } else if (m.includes('TokenError')) {
      res.status(401).send("You're login is expired. Please <a href='/auth/logout'>logout</a> and then login again.");
    } else {
      res.status(401).send('Login failed');
    }
  }
};

/**
 * Handle Spotify API errors in a user-friendly way.
 */
export const spotifyErrorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const m = err.message as string;
  if (!m || m.includes("Spotify's Web API")) {
    next(err);
  } else {
    logger.warn('Got Spotify Error:', err);
    if (err?.body?.error && err.body.error.status && err.body.error.message) {
      if (err.body.error.status === 404) {
        res
          .status(404)
          .send(
            "Spotify couldn't find this playlist. Maybe it doesn't exist anymore… Try to <a href='/playlists/recognize'>recognize</a> playlist to show only your current existing playlists."
          );
      } else {
        res.status(err.body.error.status).send(err.body.error.message);
      }
    } else {
      logger.error('Got Spotify Error with unknown format');
      res.status(500).send('There was an unknown error.');
    }
  }
};
