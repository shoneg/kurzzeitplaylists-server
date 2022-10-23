import session from 'express-session';
import passport from 'passport';
import { app } from '..';
import { SESSION_SECRET } from './config';
import { strategy } from './createSpotifyApi';

export const initPassport: () => void = () => {
  // Passport session setup.
  //   To support persistent login sessions, Passport needs to be able to
  //   serialize users into and deserialize users out of the session. Typically,
  //   this will be as simple as storing the user ID when serializing, and finding
  //   the user by ID when deserializing. However, since this example does not
  //   have a database of user records, the complete spotify profile is serialized
  //   and deserialized.
  passport.serializeUser(function (user, done) {
    done(null, user);
  });

  passport.deserializeUser(function (obj: any, done) {
    done(null, obj);
  });

  passport.use(strategy);

  app.use(session({ secret: SESSION_SECRET, resave: false, saveUninitialized: true, cookie: { sameSite: 'lax' } }));

  // Initialize Passport!  Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
};
