import { RequestHandler } from 'express';
import moment from 'moment';
import { User } from '../types';
import Logger, { DEBUG } from '../utils/logger';

const logger = new Logger(DEBUG.WARN, 'customMiddleware');

export const ensureAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    const user = User.fromExpress(req.user);
    if (moment(user.credentials.expiresAt).isBefore(moment().add(15, 's'))) {
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

export const logging: RequestHandler = (req, res, next) => {
  logger.log(`requested ${req.method} '${req.originalUrl}'`);
  next();
};
