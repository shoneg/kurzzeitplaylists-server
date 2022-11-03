import moment, { Moment } from 'moment';
import Logger, { DEBUG } from '../utils/logger';

const logger = new Logger(DEBUG.WARN, '/types/spotifyCredentials');

class SpotifyCredentials {
  private _accessToken: string;
  private _expiresAt: Moment;
  private _refreshToken: string;

  //* getter, setter
  public get accessToken(): string {
    return this._accessToken;
  }
  public set accessToken(value: string) {
    this._accessToken = value;
  }

  public get expiresAt(): Moment {
    return this._expiresAt;
  }
  public set expiresAt(value: Moment) {
    this._expiresAt = value;
  }

  public get refreshToken(): string {
    return this._refreshToken;
  }
  public set refreshToken(value: string) {
    this._refreshToken = value;
  }

  // * constructors
  public constructor(accessToken: string, expiresAt: Parameters<typeof moment>[0], refreshToken: string) {
    this._accessToken = accessToken;
    this._expiresAt = moment(expiresAt);
    this._refreshToken = refreshToken;
  }

  //* methods
  public update(newValues: Partial<SpotifyCredentials>): SpotifyCredentials {
    const { accessToken, expiresAt, refreshToken } = newValues;
    if (accessToken) this.accessToken = accessToken;
    if (expiresAt) this.expiresAt = expiresAt;
    if (refreshToken) this.refreshToken = refreshToken;
    return this;
  }
}

export default SpotifyCredentials;
