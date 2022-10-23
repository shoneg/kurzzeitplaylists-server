import { Strategy as SpotifyStrategy } from 'passport-spotify';
import SpotifyWebApi from 'spotify-web-api-node';
import { CLIENT_ID, CLIENT_SECRET, HOST, PORT } from './config';
import { MyUser } from './types';

export const authCallbackPath = Object.freeze('/auth/spotify/callback');
const redirectUri = Object.freeze(`http://${HOST}:${PORT}${authCallbackPath}`);

export const strategy = new SpotifyStrategy(
    {
        clientID: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        callbackURL: redirectUri,
    },
    function (accessToken, refreshToken, expires_in, profile, done) {
        // asynchronous verification, for effect...
        process.nextTick(function () {
            // To keep the example simple, the user's spotify profile is returned to
            // represent the logged-in user. In a typical application, you would want
            // to associate the spotify account with a user record in your database,
            // and return that user instead.
            const user: MyUser = { profile, accessToken, refreshToken }
            return done(null, user);
        });
    }
);

export const spotify = new SpotifyWebApi({
    clientId: CLIENT_ID,
    clientSecret: CLIENT_SECRET,
    redirectUri,
});