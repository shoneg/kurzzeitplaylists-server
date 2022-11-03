import { CLIENT_ID, CLIENT_SECRET, HOST, PORT } from './config';
import { Strategy as SpotifyStrategy } from 'passport-spotify';
import { User } from './types';
import moment from 'moment';
import SpotifyWebApi from 'spotify-web-api-node';
import DB from './db';
import Logger, { DEBUG } from './utils/logger';

const logger = new Logger(DEBUG.WARN, '/spotifyApi');

const authCallbackPath = Object.freeze('/auth/callback');
const redirectUri = Object.freeze(`http://${HOST}:${PORT}${authCallbackPath}`);

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
        .then((isUser) => {
          if (isUser) {
            const loadedUser = isUser;
            if (loadedUser.credentials.expiresAt.isBefore(moment().add(30, 's'))) {
              loadedUser
                .refreshCredentials()
                .then((updatedUser) => done(null, updatedUser))
                .catch(done);
            } else {
              done(null, isUser);
            }
          } else {
            const { displayName, id } = profile;
            const expiresAt = moment().add(expires_in, 's');
            const user: User = new User([accessToken, expiresAt, refreshToken], displayName, id);
            db.user
              .insert(user)
              .then(() => done(null, user))
              .catch(() => done(new Error('registration failed')));
          }
        })
        .catch(() => done(new Error('login failed')));
    });
  }
);

export const getSpotify = (arg: { accessToken: string; refreshToken: string } | User) =>
  new SpotifyWebApi({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri,
    accessToken: (arg as User).credentials?.accessToken || (arg as { accessToken: string }).accessToken,
    refreshToken: (arg as User).credentials?.refreshToken || (arg as { refreshToken: string }).refreshToken,
  });

export const refreshAllSessions = (expireBefore = moment()): Promise<void> => {
  const db = DB.getInstance();
  return new Promise<void>((res, rej) => {
    db.user.getAllExpiresBefore(expireBefore)
      .then((users) => {
        const refreshPromises = users.map((u) => u.refreshCredentials());
        Promise.all(refreshPromises)
          .then(() => {
            logger.info(
              `All user credentials, that expires before ${expireBefore.toISOString()} were successfully refreshed.`
            );
            res();
          })
          .catch((err) => {
            logger.warn('While refreshing user credentials we got an err:', err);
            rej();
          });
      })
      .catch((err) => {
        logger.warn('Got an error while getting users, whose credentials should be refreshed:', err);
        rej();
      });
  });
};
