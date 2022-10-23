import { Strategy as SpotifyStrategy } from 'passport-spotify';
import SpotifyWebApi from 'spotify-web-api-node';
import { CLIENT_ID, CLIENT_SECRET, HOST, PORT } from './config';
import { MyUser } from './types';

const authCallbackPath = Object.freeze('/auth/callback');
const redirectUri = Object.freeze(`http://${HOST}:${PORT}${authCallbackPath}`);

export const strategy = new SpotifyStrategy(
  {
    clientID: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    callbackURL: redirectUri,
  },
  function (accessToken, refreshToken, expires_in, profile, done) {
    process.nextTick(() => {
      const user: MyUser = { profile, accessToken, refreshToken };
      return done(null, user);
    });
  }
);

export const spotify = new SpotifyWebApi({
  clientId: CLIENT_ID,
  clientSecret: CLIENT_SECRET,
  redirectUri,
});
