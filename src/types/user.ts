import moment from 'moment';
import DB from '../db';
import { getSpotify } from '../spotifyApi';
import Logger, { DEBUG } from '../utils/logger';
import SpotifyCredentials from './spotifyCredentials';

const logger = new Logger(DEBUG.WARN, '/types/user');

class User {
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
