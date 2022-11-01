import { CLIENT_ID, CLIENT_SECRET, HOST, PORT } from './config';
import { Strategy as SpotifyStrategy } from 'passport-spotify';
import { User } from './types';
import moment from 'moment';
import SpotifyWebApi from 'spotify-web-api-node';
import { DB } from './db';

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
      db.isUser(profile.id).then((isUser) => {
        if (isUser) {
          db.getUser(profile.id)
            .then((user) => done(null, user))
            .catch(() => done(new Error('login failed')));
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
      });
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
