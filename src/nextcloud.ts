import OAuth2Strategy from 'passport-oauth2';
import {
  HOST,
  NEXTCLOUD_CLIENT_ID,
  NEXTCLOUD_CLIENT_SECRET,
  NEXTCLOUD_URL,
  PORT,
  RUNNING_WITH_TLS,
  URI,
} from './config';

export const strategy = new OAuth2Strategy(
  {
    authorizationURL: `${NEXTCLOUD_URL}/index.php/apps/oauth2/authorize`,
    tokenURL: `${NEXTCLOUD_URL}/index.php/apps/oauth2/api/v1/token`,
    clientID: NEXTCLOUD_CLIENT_ID,
    clientSecret: NEXTCLOUD_CLIENT_SECRET,
    callbackURL: `${URI || `${RUNNING_WITH_TLS ? 'https' : 'http'}://${HOST}:${PORT}`}/auth/nextcloudCallback`,
  },
  function (
    accessToken: string,
    refreshToken: string,
    results: any,
    profile: any,
    done: (err?: Error | null, user?: Express.User, info?: object) => void
  ) {
    done(null, true);
  }
);
