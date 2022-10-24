import { RequestHandler } from 'express';
import { User } from '../types';
import Logger, { DEBUG } from '../utils/logger';

const logger = new Logger(DEBUG.WARN, 'customMiddleware');

export const ensureAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
};

export const logging: RequestHandler = (req, res, next) => {
  logger.log(`requested ${req.method} '${req.originalUrl}'`);
  next();
};
