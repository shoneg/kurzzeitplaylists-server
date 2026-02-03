import session from 'express-session';
import type { RequestHandler } from 'express';
import moment from 'moment';
import passport from 'passport';
import { app } from '..';
import { RUNNING_WITH_TLS, SESSION_SECRET, SESSION_TIMEOUT } from './config';
import { strategy as spotifyStrategy } from './spotifyApi';
import DB from './db';
import Logger, { DEBUG } from './utils/logger';

const debug = DEBUG.WARN;
const tag = '/passport';
const logger = new Logger(debug, tag);

/**
 * Initialize Passport, session store, and cookie settings.
 */
export const initPassport: () => void = () => {
  logger.info('Start initializing passport');
  passport.serializeUser((user, done) => done(null, user));

  passport.deserializeUser((obj: any, done) => done(null, obj));

  passport.use(spotifyStrategy);

  const dbSessionStore = DB.getInstance().getSessionStore();
  app.use(
    session({
      cookie: {
        sameSite: 'lax',
        httpOnly: true,
        maxAge: moment.duration(SESSION_TIMEOUT, 's').asMilliseconds(),
        secure: RUNNING_WITH_TLS,
      },
      name: 'sid',
      resave: false,
      saveUninitialized: true,
      secret: SESSION_SECRET,
      store: dbSessionStore,
      unset: 'destroy',
    }) as RequestHandler
  );

  app.use(passport.initialize() as RequestHandler);
  app.use(passport.session() as RequestHandler);
  logger.info('Init of passport done');
};
