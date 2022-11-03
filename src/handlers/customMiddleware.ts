import { RequestHandler } from 'express';
import moment from 'moment';
import { refreshCredentials } from '../spotifyApi';
import { User } from '../types';
import Logger, { DEBUG } from '../utils/logger';

const logger = new Logger(DEBUG.WARN, 'customMiddleware');

export const ensureAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    const user = req.user as User;
    if (moment(user.credentials.expiresAt).isBefore(moment().add(15, 's'))) {
    refreshCredentials(user).then((updatedUser) => {
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

export const logging: RequestHandler = (req, res, next) => {
  logger.log(`requested ${req.method} '${req.originalUrl}'`);
  next();
};
