import { RequestHandler } from 'express';
import moment from 'moment';
import { URI } from '../config';
import { User } from '../types';
import Logger, { DEBUG } from '../utils/logger';

const logger = new Logger(DEBUG.WARN, 'customMiddleware');

/**
 * Ensure the request has a valid authenticated user session.
 */
export const ensureAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    const user = User.fromExpress(req.user);
    if (moment(user.credentials.expiresAt).isBefore(moment().add(15, 's'))) {
      // Proactively refresh tokens to avoid user-visible failures.
      user.refreshCredentials().then((updatedUser) => {
        req.user = updatedUser;
        return next();
      });
    } else {
      return next();
    }
  } else {
    res.redirect('/');
  }
};

/**
 * Ensure a valid Nextcloud token was provided during login.
 */
export const ensureNextcloudLogin: RequestHandler = (req, res, next) => {
  const { token } = req.query;
  if (!token) {
    res.status(400).send("<p>Missing token! Got to the <a href='/'>start page</a> to get one.</p>");
  } else if (!User.isInWaitingFor(token.toString())) {
    res.status(401).send("<p>You're token expired. Try to <a href='/auth'>login</a> again.</p>");
  } else {
    next();
  }
};

/**
 * Reroute requests to the canonical host when `URI` is configured.
 */
export const reroute: RequestHandler = (req, res, next) => {
  const url = new URL(req.protocol + '://' + req.get('host') + req.originalUrl);
  if (URI && new URL(URI).host !== url.host) {
    res.redirect(URI + url.pathname + url.search + url.hash);
  } else {
    next();
  }
};

/**
 * Log each incoming request for visibility while developing.
 */
export const logging: RequestHandler = (req, res, next) => {
  logger.log(`requested ${req.method} '${req.originalUrl}'`);
  next();
};
