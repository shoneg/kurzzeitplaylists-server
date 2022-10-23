import session from 'express-session';
import passport from 'passport';
import { app } from '..';
import { SESSION_SECRET } from './config';
import { strategy } from './createSpotifyApi';

export const initPassport: () => void = () => {
  passport.serializeUser((user, done) => done(null, user));

  passport.deserializeUser((obj: any, done) => done(null, obj));

  passport.use(strategy);

  app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: true, cookie: { sameSite: 'lax' } }));

  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
};
