import { randomUUID } from 'crypto';
import moment from 'moment';
import DB from '../db';
import { getSpotify } from '../spotifyApi';
import Logger, { DEBUG } from '../utils/logger';
import SpotifyCredentials from './spotifyCredentials';

const logger = new Logger(DEBUG.WARN, '/types/user');

class User {
  private static waitingFor: { timestamp: Date; token: string }[] = [];
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

  static {
    setInterval(() => {
      this.waitingFor.forEach((elm, index) => {
        if (moment(elm.timestamp).isBefore(moment().add(30, 's'))) {
          delete this.waitingFor[index];
        }
      });
    }, moment.duration(60, 's').asMilliseconds());
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
  public static addWaitFor = (token?: string): string => {
    const _token = token || randomUUID();
    this.waitingFor.push({ timestamp: new Date(), token: _token });
    return _token;
  };
  public static isInWaitingFor = (token: string): boolean => {
    const i = this.waitingFor.map((w) => w.token).indexOf(token);
    if (i) {
      delete this.waitingFor[i];
    }
    return i >= 0;
  };

  //* methods
  public refreshCredentials(): Promise<User> {
    const db = DB.getInstance();
    return new Promise<User>((res, rej) => {
      this._credentials
        .refresh()
        .then(() => db.user.get(this._spotifyId).then(res).catch(rej))
        .catch(rej);
    });
  }
}

export default User;
