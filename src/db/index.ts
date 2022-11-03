import { readFile } from 'fs';
import { Store } from 'express-session';
import moment, { Moment } from 'moment';
import mysql, { FieldPacket, OkPacket, Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import MySQLSession from 'express-mysql-session';

import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER, SESSION_TIMEOUT } from '../config';

import Logger, { DEBUG } from '../utils/logger';
import { Playlist, User } from '../types';
import { DBPlaylist, DBUser } from './types';
import { dbPlaylists2Playlist, dbUser2User } from './converter';

const logger = new Logger(DEBUG.WARN, '/db');

const MySQLStore = MySQLSession(require('express-session'));

export class DB {
  private static instance: DB;
  private static sessionStore?: Store;
  private pool: Pool;
  private constructor() {
    this.pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      database: DB_NAME,
      port: DB_PORT,
      password: DB_PASSWORD,
    });
  }

  static {
    this.instance = new DB();
  }

  public static getInstance(): DB {
    return DB.instance;
  }

  public query<T extends RowDataPacket[][] | RowDataPacket[] | OkPacket | OkPacket[] | ResultSetHeader>(
    sql: string,
    values: any | any[] | { [param: string]: any }
  ): Promise<[T, FieldPacket[]]> {
    return this.pool.query<T>(sql, values);
  }

  public testConnection(): Promise<boolean> {
    return new Promise<boolean>((res) =>
      this.pool
        .query('SELECT * FROM user LIMIT 1')
        .then(() => res(true))
        .catch(() => res(false))
    );
  }

  public crateDbIfNotExist(): Promise<void> {
    return new Promise<void>((res, rej) => {
      readFile('src/db/createDb.sql', (readFileErr, creationScript) => {
        if (readFileErr) {
          rej(readFileErr);
        }
        creationScript
          .toString()
          .split(';')
          .forEach((statement) => this.pool.query(statement).catch(rej));
        res();
      });
    });
  }

  public getSessionStore(): Store {
    if (!DB.sessionStore) {
      DB.sessionStore = new MySQLStore(
        {
          checkExpirationInterval: moment.duration(60, 's').asMilliseconds(),
          expiration: moment.duration(SESSION_TIMEOUT, 's').asMilliseconds(),
        },
        this.pool,
        (err) => err && logger.error('Got error while init of sessionStore:', err)
      );
    }
    return DB.sessionStore;
  }

  //* ----------------------------
  //* |         playlists        |
  //* ----------------------------

  public getPlaylistsOfUser(user: User | string): Promise<Playlist[]> {
    let userId: string;
    if (typeof user === 'string') {
      userId = user;
    } else {
      userId = user.spotifyId;
    }

    return new Promise<Playlist[]>((res, rej) => {
      this.pool
        .query<RowDataPacket[]>('SELECT * FROM playlist WHERE owner = ?', [userId])
        .then((result) => {
          const dbPlaylists = result[0] as DBPlaylist[];
          const playlists = dbPlaylists.map(dbPlaylists2Playlist);
          res(playlists);
        })
        .catch((err) => {
          logger.error(`Got an unexpected error while getting playlists of user with id='${userId}':`, err);
          rej('Cannot get playlists');
        });
    });
  }

  /**
   * @returns number of added rows
   */
  public insertPlaylists(playlists: Playlist[]): Promise<number> {
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

  /**
   * @returns number of deleted rows
   */
  public deletePlaylists(playlists: Playlist[]): Promise<number> {
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

  //* ----------------------------
  //* |           user           |
  //* ----------------------------

  public addUser(user: User): Promise<void> {
    const { credentials, displayName, spotifyId } = user;
    const { accessToken, expiresAt, refreshToken } = credentials;
    return new Promise<void>((res, rej) => {
      this.pool
        .query<ResultSetHeader>(
          `
    INSERT INTO user (
        accessToken,
        displayName,
        expiresAt,
        refreshToken,
        spotifyId
      )
    VALUES ( ?, ?, ?, ?, ? )`,
          [accessToken, displayName, expiresAt.toDate(), refreshToken, spotifyId]
        )
        .then((result) => {
          if (result[0].affectedRows === 1) {
            res();
          } else {
            logger.warn(`unexpectedly ${result[0].affectedRows} where inserted into user instead of 1.`);
            res();
          }
        })
        .catch((err) => {
          logger.error('Got error while inserting user:', err);
          rej();
        });
    });
  }

  public getUser(id: string): Promise<User> {
    return new Promise<User>((res, rej) => {
      this.pool
        .query<RowDataPacket[]>('SELECT * FROM user WHERE spotifyId = ? LIMIT 1', [id])
        .then((result) => {
          const dbUser = result[0][0] as DBUser;
          const user = dbUser2User(dbUser);
          res(user);
        })
        .catch((err) => {
          logger.error(`Got an unexpected error while getting user with id='${id}':`, err);
          rej('Cannot get user');
        });
    });
  }

  public getUsersExpiresBefore(expiresBefore: Moment): Promise<User[]> {
    return new Promise<User[]>((res, rej) => {
      this.pool
        .query<RowDataPacket[]>('SELECT * FROM user WHERE expiresAt < ?', [expiresBefore.toDate()])
        .then((queryResult) => {
          const dbUsers = queryResult[0] as DBUser[];
          const users = dbUsers.map(dbUser2User);
          res(users);
        })
        .catch((err) => {
          logger.error('Got an unexpected error while getting users:', err);
          rej('Error while querying users');
        });
    });
  }

  public isUser(id: string): Promise<User | false> {
    return new Promise<User | false>((res) =>
      this.pool
        .query<RowDataPacket[]>('SELECT * FROM user WHERE spotifyId = ?', [id])
        .then((result) => {
          const count = result[0].length;
          if (count >= 1) {
            if (count > 1) {
              logger.warn(`Seems like there's ${count} (more than 1) user with id '${id}'`);
            }
            const dbUser = result[0][0] as DBUser;
            const user = dbUser2User(dbUser);
            res(user);
          } else {
            res(false);
          }
        })
        .catch((err) => {
          logger.error('Got an unexpected error while looking for user:', err);
          res(false);
        })
    );
  }

  public updateUser(user: Pick<User, 'spotifyId'> & Partial<Omit<User, 'spotifyId'>>): Promise<User> {
    const { spotifyId, displayName, credentials } = user;
    const { accessToken, expiresAt, refreshToken } = credentials || {};
    if (displayName || accessToken || expiresAt || refreshToken) {
      let query = 'UPDATE user SET ';
      const values: (string | Date)[] = [];
      (
        [
          { v: accessToken, n: 'accessToken' },
          { v: expiresAt?.toDate(), n: 'expiresAt' },
          { v: displayName, n: 'displayName' },
          { v: refreshToken, n: 'refreshToken' },
        ] as { v: string | Date; n: string }[]
      ).forEach(({ v, n }) => {
        if (v) {
          query += n + ' = ?, ';
          values.push(v);
        }
      });
      query = query.substring(0, query.length - 2) + ' WHERE spotifyId = ?';
      values.push(spotifyId);
      return new Promise<User>((res, rej) => {
        this.pool
          .query<ResultSetHeader>(query, values)
          .then((result) => {
            const { affectedRows } = result[0];
            if (affectedRows >= 1) {
              if (affectedRows > 1) {
                logger.error(
                  `Seems like there's ${affectedRows} (more than 1) user with id '${spotifyId}', now all the false one have wrong credentials`
                );
              }
              res(this.getUser(spotifyId));
            }
          })
          .catch((err) => {
            logger.error(`Unexpectedly we couldn't update user with id='${spotifyId}' and got error:`, err);
            rej(`Couldn't update user, got an error`);
          });
      });
    } else {
      return this.getUser(spotifyId);
    }
  }
}
