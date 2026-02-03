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
  public refresh(deps?: {
    db?: DB;
    spotify?: ReturnType<typeof getSpotify>;
    spotifyFactory?: typeof getSpotify;
    now?: Moment;
  }): Promise<void> {
    const db = deps?.db ?? DB.getInstance();
    const spotify = deps?.spotify ?? (deps?.spotifyFactory ? deps.spotifyFactory(this) : getSpotify(this));
    const now = deps?.now ?? moment();
    return spotify
      .refreshAccessToken()
      .then((refreshResult) => {
        const { access_token, refresh_token, expires_in } = refreshResult.body;
        this._accessToken = access_token;
        this._expiresAt = now.clone().add(expires_in, 's');
        if (refresh_token) this._refreshToken = refresh_token;
        return db.credentials.update(this, this._spotifyId).then(() => undefined);
      })
      .catch((err) => {
        logger.error(`While refreshing access token of user with id='${this._spotifyId}', we got an error:`, err);
        return Promise.reject(err);
      });
  }
}

export default SpotifyCredentials;
