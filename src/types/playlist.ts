import moment from 'moment';
import { Moment } from 'moment';
import SpotifyWebApi from 'spotify-web-api-node';
import Logger, { DEBUG } from '../utils/logger';

const logger = new Logger(DEBUG.WARN, '/types/playlist');

class Playlist {
  private _discardPlaylist?: string | undefined;
  private _maxTrackAge?: number | undefined;
  private _maxTracks?: number | undefined;
  private _name: string;
  private _numberOfTracks: number;
  private _oldestTrack: Moment;
  private _ownerId: string;
  private _spotifyId: string;

  //* getter, setter
  public get discardPlaylist(): string | undefined {
    return this._discardPlaylist;
  }
  public set discardPlaylist(value: string | undefined) {
    this._discardPlaylist = value;
  }

  public get maxTrackAge(): number | undefined {
    return this._maxTrackAge;
  }
  public set maxTrackAge(value: number | undefined) {
    this._maxTrackAge = value;
  }

  public get maxTracks(): number | undefined {
    return this._maxTracks;
  }
  public set maxTracks(value: number | undefined) {
    this._maxTracks = value;
  }

  public get name(): string {
    return this._name;
  }
  public set name(value: string) {
    this._name = value;
  }

  public get numberOfTracks(): number {
    return this._numberOfTracks;
  }
  public set numberOfTracks(value: number) {
    this._numberOfTracks = value;
  }

  public get oldestTrack(): Moment {
    return this._oldestTrack;
  }
  public set oldestTrack(value: Moment) {
    this._oldestTrack = value;
  }

  public get ownerId(): string {
    return this._ownerId;
  }

  public get spotifyId(): string {
    return this._spotifyId;
  }

  // * constructors
  public constructor({
    discardPlaylist,
    maxTrackAge,
    maxTracks,
    name,
    numberOfTracks,
    oldestTrack,
    ownerId,
    spotifyId,
  }: {
    discardPlaylist?: string;
    maxTrackAge?: number;
    maxTracks?: number;
    name: string;
    numberOfTracks: number;
    oldestTrack: Moment;
    ownerId: string;
    spotifyId: string;
  }) {
    this._discardPlaylist = discardPlaylist;
    this._maxTrackAge = maxTrackAge;
    this._maxTracks = maxTracks;
    this._name = name;
    this._numberOfTracks = numberOfTracks;
    this._oldestTrack = oldestTrack;
    this._ownerId = ownerId;
    this._spotifyId = spotifyId;
  }

  //* static methods
  public static fromApiObj(simplePlaylist: SpotifyApi.PlaylistObjectSimplified, oldestTrackValue = moment()): Playlist {
    const { name, tracks, owner, id } = simplePlaylist;
    const playlist = new Playlist({
      name,
      numberOfTracks: tracks.total,
      oldestTrack: oldestTrackValue,
      ownerId: owner.id,
      spotifyId: id,
    });
    return playlist;
  }

  public static getMany = (
    offset: number,
    limit: number,
    spotify: SpotifyWebApi
  ): Promise<SpotifyApi.PlaylistObjectSimplified[]> => {
    return new Promise<SpotifyApi.PlaylistObjectSimplified[]>((res, rej) => {
      spotify.getUserPlaylists({ offset, limit }).then((result) => {
        if (result.statusCode !== 200) {
          const body = result.body as { error?: { status?: number; message?: string } | undefined };
          rej(`Got statusCode=${result.statusCode} from spotify with message='${body?.error?.message}'`);
        }
        const nextURL = result.body.next;
        if (nextURL) {
          const nextURLMatcher = nextURL.match(/playlists\?offset=(\d+)\&limit=(\d+)$/);
          if (nextURLMatcher) {
            const nextOffset = parseInt(nextURLMatcher[1]);
            const nextLimit = parseInt(nextURLMatcher[2]);
            this.getMany(nextOffset, nextLimit, spotify)
              .then((nextResult) => res(nextResult.concat(result.body.items)))
              .catch(rej);
          } else {
            rej(
              `While parsing nextURL, we unexpectedly got a falsy result. With nextURL='${nextURL}', we got as '${nextURLMatcher}' as result`
            );
          }
        } else {
          res(result.body.items);
        }
      });
    });
  };

  //* methods
}

export default Playlist;
