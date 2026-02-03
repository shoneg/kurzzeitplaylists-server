import { CLIENT_ID, CLIENT_SECRET, HOST, PROXY_PORT, RUNNING_WITH_TLS, URI } from './config';
import { Strategy as SpotifyStrategy } from 'passport-spotify';
import { User } from './types';
import moment from 'moment';
import SpotifyWebApi from 'spotify-web-api-node';
import DB from './db';
import Logger, { DEBUG } from './utils/logger';

const logger = new Logger(DEBUG.WARN, '/spotifyApi');

/** OAuth callback path registered with Spotify. */
const authCallbackPath = Object.freeze('/auth/callback');
/**
 * Full redirect URI passed to Spotify for OAuth.
 * Uses `URI` as canonical origin when configured to avoid host mismatches.
 */
const redirectUri = Object.freeze(
  `${URI || `${RUNNING_WITH_TLS ? 'https' : 'http'}://${HOST}:${PROXY_PORT}`}${authCallbackPath}`
);

/**
 * Passport strategy for Spotify OAuth.
 */
export const strategy = new SpotifyStrategy(
  {
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: redirectUri,
  },
  function (accessToken, refreshToken, expires_in, profile, done) {
    const db = DB.getInstance();
    process.nextTick(() => {
      db.user
        .exist(profile.id)
        .then((loadedUser) => {
          const { displayName, id } = profile;
          const expiresAt = moment().add(expires_in, 's');
          const newUser: User = new User([accessToken, expiresAt, refreshToken, id], displayName, id);
          if (loadedUser) {
            if (loadedUser.credentials.expiresAt.isBefore(moment().add(30, 's'))) {
              // Refresh near-expiring credentials to reduce redirect loops.
              db.user.update(newUser)
                .then((updatedUser) => done(null, updatedUser))
                .catch(done);
            } else {
              done(null, loadedUser);
            }
          } else {
            db.user
              .insert(newUser)
              .then(() => done(null, newUser))
              .catch(() => done(new Error('registration failed')));
          }
        })
        .catch(() => done(new Error('login failed')));
    });
  }
);

/**
 * Create a Spotify API client for either a user or raw tokens.
 */
export const getSpotify = (arg: { accessToken: string; refreshToken: string } | User) =>
  new SpotifyWebApi({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri,
    accessToken: (arg as User).credentials?.accessToken || (arg as { accessToken: string }).accessToken,
    refreshToken: (arg as User).credentials?.refreshToken || (arg as { refreshToken: string }).refreshToken,
  });

/**
 * Refresh all sessions that expire before the given time.
 */
export const refreshAllSessions = (
  expireBefore = moment(),
  deps?: { db?: DB }
): Promise<void> => {
  const db = deps?.db ?? DB.getInstance();
  return db.credentials
    .getAllExpiresBefore(expireBefore)
    .then((credentials) => {
      const refreshPromises = credentials.map((c) => c.refresh({ db }));
      return Promise.all(refreshPromises).then(() => {
        logger.info(
          `All user credentials, that expires before ${expireBefore.toISOString()} were successfully refreshed.`
        );
      });
    })
    .catch((err) => {
      logger.warn('While refreshing user credentials we got an err:', err);
      return Promise.reject(err);
    });
};
