import moment from 'moment';
import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { Playlist as AppPlaylist } from '../types';
import Logger, { DEBUG } from '../utils/logger';
import { PlaylistModel } from './models';

const logger = new Logger(DEBUG.WARN, '/db/playlist');

class Playlist {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  static model2Playlist(dbPlaylist: PlaylistModel): AppPlaylist {
    const { discardPlaylist, maxTrackAge, maxTracks, oldestTrack, owner: ownerId, ...rest } = dbPlaylist;
    const f = (v: any) => v ?? undefined;
    const playlist = new AppPlaylist({
      ...rest,
      discardPlaylist: f(discardPlaylist),
      maxTrackAge: f(maxTrackAge),
      maxTracks: f(maxTracks),
      oldestTrack: moment(oldestTrack),
      ownerId,
    });
    return playlist;
  }

  public filterUnknown<T extends { id: string }>(playlists: T[]): Promise<T[]> {
    let query = `
      SELECT * FROM playlist WHERE spotifyId IN (
    `;
    for (let i = 0; i < playlists.length; i++) {
      query += '?, ';
    }
    query = query.substring(0, query.length - 2) + ')';

    const idList = playlists.map((p) => p.id);

    return new Promise<T[]>((res, rej) => {
      this.pool
        .query<RowDataPacket[]>(query, idList)
        .then((results) => {
          const foundIDs = results[0].map((f) => f.spotifyId);
          const ret = playlists.filter((p) => !foundIDs.includes(p.id));
          res(ret);
        })
        .catch((err) => {
          logger.error('Got an unexpected error while looking for known playlists:', err);
          rej('Unexpectedly we got an Error while filtering the playlists');
        });
    });
  }

  get(id: string): Promise<AppPlaylist> {
    return new Promise<AppPlaylist>((res, rej) => {
      this.pool
        .query<RowDataPacket[]>('SELECT * FROM playlist WHERE spotifyId = ?', [id])
        .then((queryResult) => {
          const count = queryResult[0].length;
          if (count >= 1) {
            if (count > 1) {
              logger.warn(`There were found ${count} playlists with id='${id}'`);
            }
            const dbPlaylist = queryResult[0][0] as PlaylistModel;
            const playlist = Playlist.model2Playlist(dbPlaylist);
            res(playlist);
          } else {
            logger.info(`no playlist found for id='${id}'`);
            rej('Cannot find playlist');
          }
        })
        .catch((err) => {
          logger.error(`Got an unexpected error while getting playlist with id='${id}':`, err);
          rej('Error while querying playlist');
        });
    });
  }

  /**
   * @returns number of added rows
   */
  insert(playlists: AppPlaylist[]): Promise<number> {
    let insertQuery = `
    INSERT INTO playlist (
      name,
      numberOfTracks,
      oldestTrack,
      owner,
      spotifyId
    )
    VALUES `;
    let insertValues: (number | string | Date | null)[] = [];
    playlists.forEach((p) => {
      const { name, numberOfTracks, oldestTrack, ownerId, spotifyId } = p;
      insertQuery += ' (?, ?, ?, ?, ? ),';
      insertValues.push(name, numberOfTracks, oldestTrack.toDate(), ownerId, spotifyId);
    });
    insertQuery = insertQuery.substring(0, insertQuery.length - 1);
    return new Promise<number>((res, rej) => {
      this.pool
        .query<ResultSetHeader>(insertQuery, insertValues)
        .then((insertResult) => {
          res(insertResult[0].affectedRows);
        })
        .catch((err) => {
          logger.error('While inserting playlists we got an unexpected error:', err);
          rej(err);
        });
    });
  }

  update(playlist: Pick<AppPlaylist, 'spotifyId'> & Partial<Omit<AppPlaylist, 'spotifyId'>>): Promise<AppPlaylist> {
    const { discardPlaylist, maxTrackAge, maxTracks, name, numberOfTracks, oldestTrack, spotifyId } = playlist;
    if (discardPlaylist || maxTrackAge || maxTracks || name || numberOfTracks || oldestTrack) {
      let query = 'UPDATE playlist SET ';
      let values: (string | Date)[] = [];
      (
        [
          { v: discardPlaylist, n: 'discardPlaylist' },
          { v: maxTrackAge, n: 'maxTrackAge' },
          { v: maxTracks, n: 'maxTracks' },
          { v: name, n: 'name' },
          { v: numberOfTracks, n: 'numberOfTracks' },
          { v: oldestTrack?.toDate(), n: 'oldestTrack' },
        ] as { v: string | Date; n: string }[]
      ).forEach(({ v, n }) => {
        if (v) {
          query += n + ' = ?, ';
          values.push(v);
        }
      });
      query = query.substring(0, query.length - 2) + ' WHERE spotifyId = ?';
      values.push(spotifyId);
      return new Promise<AppPlaylist>((res, rej) => {
        this.pool
          .query<ResultSetHeader>(query, values)
          .then((updateResult) => {
            const { affectedRows } = updateResult[0];
            if (affectedRows >= 1) {
              if (affectedRows > 1) {
                logger.warn(`Instead of 1 row, we've updated ${affectedRows}`);
              }
              this.get(playlist.spotifyId).then(res).catch(rej);
            } else {
              logger.warn('We did inserted 0 instead of 1 row into playlist');
              rej('Could not find playlist');
            }
          })
          .catch((err) => {
            logger.error(`Got an unexpected error while updating playlist with id='${spotifyId}':`, err);
            rej('Error while updating');
          });
      });
    } else {
      return this.get(playlist.spotifyId);
    }
  }

  /**
   * @returns number of deleted rows
   */
  public delete(playlists: AppPlaylist[]): Promise<number> {
    return new Promise<number>((res, rej) => {
      let deleteQuery = 'DELETE FROM playlist WHERE spotifyId IN (';
      for (let i = 0; i < playlists.length; i++) {
        deleteQuery += '?, ';
      }
      deleteQuery = deleteQuery.substring(0, deleteQuery.length - 2) + ')';
      const deleteIds = playlists.map((p) => p.spotifyId);
      this.pool
        .query<ResultSetHeader>(deleteQuery, deleteIds)
        .then((deleteResult) => {
          res(deleteResult[0].affectedRows);
        })
        .catch((err) => {
          logger.error('While deleting playlists we got an unexpected error:', err);
          rej(err);
        });
    });
  }
}

export default Playlist;
