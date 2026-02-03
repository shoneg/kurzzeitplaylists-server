import moment, { Moment } from 'moment';
import DB from '../db';
import { getSpotify } from '../spotifyApi';
import Logger, { DEBUG } from '../utils/logger';

const logger = new Logger(DEBUG.WARN, '/types/spotifyCredentials');

class SpotifyCredentials {
  private _accessToken: string;
  private _expiresAt: Moment;
  private _refreshToken: string;
  private _spotifyId: string;

  //* getter, setter
  public get accessToken(): string {
    return this._accessToken;
  }
  public get expiresAt(): Moment {
    return this._expiresAt;
  }
  public get refreshToken(): string {
    return this._refreshToken;
  }

  // * constructors
  public constructor(
    accessToken: string,
    expiresAt: Parameters<typeof moment>[0],
    refreshToken: string,
    spotifyId: string
  ) {
    this._accessToken = accessToken;
    this._expiresAt = moment(expiresAt);
    this._refreshToken = refreshToken;
    this._spotifyId = spotifyId;
  }

  //* methods
  public refresh(): Promise<void> {
    const db = DB.getInstance();
    return new Promise<void>((res, rej) => {
      getSpotify(this)
        .refreshAccessToken()
        .then((refreshResult) => {
          const { access_token, refresh_token, expires_in } = refreshResult.body;
          this._accessToken = access_token;
          this._expiresAt = moment().add(expires_in, 's');
          if (refresh_token) this._refreshToken = refresh_token;
          db.credentials
            .update(this, this._spotifyId)
            .then(() => res())
            .catch(rej);
        })
        .catch((err) => {
          logger.error(`While refreshing access token of user with id='${this._spotifyId}', we got an error:`, err);
          rej(err);
        });
    });
  }
}

export default SpotifyCredentials;
