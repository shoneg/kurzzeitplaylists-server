import session from 'express-session';
import passport from 'passport';
import { app } from '..';
import { SESSION_SECRET } from './config';
import { strategy } from './createSpotifyApi';
import Logger, { DEBUG } from './utils/logger';

const debug = DEBUG.WARN;
const tag = '/passport';
const logger = new Logger(debug, tag);

export const initPassport: () => void = () => {
  logger.info('Start initializing passport');
  passport.serializeUser((user, done) => done(null, user));

  passport.deserializeUser((obj: any, done) => done(null, obj));

  passport.use(strategy);

  app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: true, cookie: { sameSite: 'lax' } }));

  app.use(passport.initialize());
  app.use(passport.session());
  logger.info('Init of passport done');
};
