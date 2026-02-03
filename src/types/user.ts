import { randomUUID } from 'crypto';
import moment from 'moment';
import DB from '../db';
import { getSpotify } from '../spotifyApi';
import Logger, { DEBUG } from '../utils/logger';
import SpotifyCredentials from './spotifyCredentials';

const logger = new Logger(DEBUG.WARN, '/types/user');

/**
 * Authenticated Spotify user plus credentials and helper utilities.
 */
class User {
  private static waitingFor: { timestamp: Date; token: string }[] = [];
  private static waitingForCleanupTimer: NodeJS.Timeout | undefined;
  private _credentials: SpotifyCredentials;
  private _displayName: string;
  private _spotifyId: string;

  //* getter, setter
  public get credentials(): SpotifyCredentials {
    return this._credentials;
  }

  public get displayName(): string {
    return this._displayName;
  }
  public set displayName(value: string) {
    this._displayName = value;
  }

  public get spotifyId(): string {
    return this._spotifyId;
  }

  /**
   * Start background cleanup for temporary login tokens.
   */
  public static startWaitingForCleanup(): void {
    if (this.waitingForCleanupTimer) {
      return;
    }
    this.waitingForCleanupTimer = setInterval(() => {
      const cutoff = moment().subtract(30, 's');
      this.waitingFor = this.waitingFor.filter((elm) => moment(elm.timestamp).isAfter(cutoff));
    }, moment.duration(60, 's').asMilliseconds());
  }

  /**
   * Stop the background cleanup timer.
   */
  public static stopWaitingForCleanup(): void {
    if (this.waitingForCleanupTimer) {
      clearInterval(this.waitingForCleanupTimer);
      this.waitingForCleanupTimer = undefined;
    }
  }

  // * constructors
  public constructor(
    credentials: SpotifyCredentials | ConstructorParameters<typeof SpotifyCredentials>,
    displayName: string,
    spotifyId: string
  ) {
    if (credentials instanceof SpotifyCredentials) {
      this._credentials = credentials;
    } else {
      this._credentials = new SpotifyCredentials(credentials[0], credentials[1], credentials[2], credentials[3]);
    }
    this._displayName = displayName;
    this._spotifyId = spotifyId;
  }

  //* static methods
  /**
   * Re-hydrate a User instance from the serialized Express session.
   */
  public static fromExpress(eUser: Express.User): User {
    const { _credentials, _displayName, _spotifyId } = eUser as {
      _credentials: { _accessToken: string; _expiresAt: Date; _refreshToken: string };
      _displayName: string;
      _spotifyId: string;
    };
    const { _accessToken, _expiresAt, _refreshToken } = _credentials;
    const user = new User([_accessToken, _expiresAt, _refreshToken, _spotifyId], _displayName, _spotifyId);
    return user;
  }
  /**
   * Register a one-time token for external login flows.
   */
  public static addWaitFor = (token?: string): string => {
    const _token = token || randomUUID();
    this.waitingFor.push({ timestamp: new Date(), token: _token });
    return _token;
  };
  /**
   * Consume a one-time token if it exists.
   */
  public static isInWaitingFor = (token: string): boolean => {
    const i = this.waitingFor.findIndex((w) => w.token === token);
    if (i >= 0) {
      this.waitingFor.splice(i, 1);
      return true;
    }
    return false;
  };

  //* methods
  /**
   * Refresh Spotify credentials and return the latest user model.
   */
  public refreshCredentials(deps?: { db?: DB }): Promise<User> {
    const db = deps?.db ?? DB.getInstance();
    return this._credentials.refresh({ db }).then(() => db.user.get(this._spotifyId));
  }
}

export default User;
