import { CLIENT_ID, CLIENT_SECRET, HOST, PORT } from './config';
import { Strategy as SpotifyStrategy } from 'passport-spotify';
import { SpotifyCredentials, User } from './types';
import moment from 'moment';
import SpotifyWebApi from 'spotify-web-api-node';
import { DB } from './db';
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
      db.isUser(profile.id)
        .then((isUser) => {
          if (isUser) {
            const loadedUser = isUser;
            if (loadedUser.credentials.expiresAt.isBefore(moment().add(30, 's'))) {
              refreshCredentials(loadedUser)
                .then((updatedUser) => done(null, updatedUser))
                .catch(done);
            } else {
              done(null, isUser);
            }
          } else {
            const user: User = {
              credentials: { accessToken, refreshToken, expiresAt: moment().add(expires_in, 's') },
              displayName: profile.displayName,
              spotifyId: profile.id,
            };
            db.addUser(user)
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

export const refreshCredentials = (user: User): Promise<User> => {
  const db = DB.getInstance();
  return new Promise<User>((res, rej) => {
    getSpotify(user)
      .refreshAccessToken()
      .then((refreshResult) => {
        const { access_token: accessToken, refresh_token, expires_in } = refreshResult.body;
        logger.forceLog(expires_in);
        const newCredentials: SpotifyCredentials = {
          accessToken,
          refreshToken: refresh_token || user.credentials.refreshToken,
          expiresAt: moment().add(expires_in, 's'),
        };
        db.updateUser({ spotifyId: user.spotifyId, credentials: newCredentials }).then(res).catch(rej);
      })
      .catch((err) => {
        logger.error(`While refreshing access token of user with id='${user.spotifyId}', we got an error:`, err);
        rej(err);
      });
  });
};

export const refreshAllSessions = (expireBefore = moment()): Promise<void> => {
  const db = DB.getInstance();
  return new Promise<void>((res, rej) => {
    db.getUsersExpiresBefore(expireBefore)
      .then((users) => {
        const refreshPromises = users.map((u) => refreshCredentials(u));
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
