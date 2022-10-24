import moment from 'moment';
import { Strategy as SpotifyStrategy } from 'passport-spotify';
import SpotifyWebApi from 'spotify-web-api-node';
import { CLIENT_ID, CLIENT_SECRET, HOST, PORT } from './config';
import { User } from './types';

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
      const user: User = {
        credentials: { accessToken, refreshToken, expiresAt: moment().add(expires_in, 's') },
        displayName: profile.displayName,
        playlists: [],
        spotifyApi: getSpotifyWebApi(accessToken, refreshToken),
        spotifyId: profile.id,
      };
      return done(null, user);
    });
  }
);

export const getSpotifyWebApi = (accessToken: string, refreshToken: string) => {
  const api = new SpotifyWebApi({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri,
  });
  api.setCredentials({ accessToken, refreshToken });
  return api;
};
