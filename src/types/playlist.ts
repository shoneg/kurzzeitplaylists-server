import moment from 'moment';
import { Moment } from 'moment';
import SpotifyWebApi from 'spotify-web-api-node';
import DB from '../db';
import { getSpotify } from '../spotifyApi';
import Logger, { DEBUG } from '../utils/logger';
import SpotifyCredentials from './spotifyCredentials';

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
  public static getTracks = (
    spotify: SpotifyWebApi,
    id: string,
    offset = 0,
    limit = 50,
    itemFields = 'added_at'
  ): Promise<SpotifyApi.PlaylistTrackObject[]> => {
    return spotify
      .getPlaylistTracks(id, { offset, limit, fields: `items(${itemFields}),next` })
      .then((result) => {
        if (result.statusCode !== 200) {
          const body = result.body as { error?: { status?: number; message?: string } | undefined };
          return Promise.reject(
            `Got statusCode=${result.statusCode} from spotify with message='${body?.error?.message}'`
          );
        }
        const nextURL = result.body.next;
        if (!nextURL) {
          return result.body.items;
        }
        const nextOffset = new URL(nextURL).searchParams.get('offset');
        const nextLimit = new URL(nextURL).searchParams.get('limit');
        if (!nextOffset || !nextLimit) {
          return Promise.reject(
            `nextURL='${nextURL}' doesn't contain nextOffset (${nextOffset}) or nextLimit (${nextLimit})`
          );
        }
        return this.getTracks(spotify, id, parseInt(nextOffset), parseInt(nextLimit), itemFields).then((nextResult) =>
          nextResult.concat(result.body.items)
        );
      });
  };

  public static compareLexicographic(p1: Playlist, p2: Playlist): number {
    return p1._name.localeCompare(p2.name);
  }

  public static sortLexicographic(playlists: Playlist[], order: 'az' | 'za'): Playlist[] {
    const az = [...playlists].sort(this.compareLexicographic);
    if (order === 'az') {
      return az;
    }
    return az.reverse();
  }

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
    offset = 0,
    limit = 50,
    spotify: SpotifyWebApi
  ): Promise<SpotifyApi.PlaylistObjectSimplified[]> => {
    return spotify.getUserPlaylists({ offset, limit }).then((result) => {
      if (result.statusCode !== 200) {
        const body = result.body as { error?: { status?: number; message?: string } | undefined };
        return Promise.reject(`Got statusCode=${result.statusCode} from spotify with message='${body?.error?.message}'`);
      }
      const nextURL = result.body.next;
      if (!nextURL) {
        return result.body.items;
      }
      const nextOffset = new URL(nextURL).searchParams.get('offset');
      const nextLimit = new URL(nextURL).searchParams.get('limit');
      if (!nextOffset || !nextLimit) {
        return Promise.reject(
          `nextURL='${nextURL}' doesn't contain nextOffset (${nextOffset}) or nextLimit (${nextLimit})`
        );
      }
      return this.getMany(parseInt(nextOffset), parseInt(nextLimit), spotify).then((nextResult) =>
        nextResult.concat(result.body.items)
      );
    });
  };

  //* methods
  public refresh(credentials: SpotifyCredentials, includeOldestTrack = false): Promise<Playlist> {
    const spotify = getSpotify(credentials);
    const db = DB.getInstance();
    return spotify
      .getPlaylist(this._spotifyId, {
        fields: `name,tracks(total${includeOldestTrack ? ',items(added_at),next' : ''})`,
      })
      .then(async (data) => {
        const { name, tracks } = data.body;
        const { total, items, next } = tracks;
        let allItems = items;
        if (next) {
          const nextOffset = new URL(next).searchParams.get('offset');
          const nextLimit = new URL(next).searchParams.get('limit');
          if (nextOffset && nextLimit) {
            const moreItems = await Playlist.getTracks(spotify, this._spotifyId, parseInt(nextOffset), parseInt(nextLimit));
            allItems = allItems.concat(moreItems);
          }
        }
        let oldestTrackDate: Moment = moment();
        if (includeOldestTrack) {
          allItems.forEach((i) => {
            const addedAt = moment(i.added_at);
            if (addedAt.isBefore(oldestTrackDate)) {
              oldestTrackDate = addedAt;
            }
          });
        }
        return db.playlist.update({
          spotifyId: this._spotifyId,
          name: name !== this._name ? name : undefined,
          numberOfTracks: total !== this._numberOfTracks ? total : undefined,
          oldestTrack: includeOldestTrack ? oldestTrackDate : undefined,
        });
      });
  }
}

export default Playlist;
