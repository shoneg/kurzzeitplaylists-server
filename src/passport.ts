import session from 'express-session';
import moment from 'moment';
import passport from 'passport';
import { app } from '..';
import { SECURE_COOKIES_ONLY, SESSION_SECRET, SESSION_TIMEOUT } from './config';
import { strategy } from './spotifyApi';
import DB from './db';
import Logger, { DEBUG } from './utils/logger';

const debug = DEBUG.WARN;
const tag = '/passport';
const logger = new Logger(debug, tag);

export const initPassport: () => void = () => {
  logger.info('Start initializing passport');
  passport.serializeUser((user, done) => done(null, user));

  passport.deserializeUser((obj: any, done) => done(null, obj));

  passport.use(strategy);

  const dbSessionStore = DB.getInstance().getSessionStore();
  app.use(
    session({
      cookie: {
        sameSite: 'lax',
        httpOnly: true,
        maxAge: moment.duration(SESSION_TIMEOUT, 's').asMilliseconds(),
        secure: SECURE_COOKIES_ONLY,
      },
      name: 'sid',
      resave: false,
      saveUninitialized: true,
      secret: SESSION_SECRET,
      store: dbSessionStore,
      unset: 'destroy',
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());
  logger.info('Init of passport done');
};
