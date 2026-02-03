import { readFile } from 'fs';
import { Store } from 'express-session';
import moment from 'moment';
import mysql, { FieldPacket, OkPacket, Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import MySQLSession from 'express-mysql-session';

import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER, SESSION_TIMEOUT } from '../config';

import Logger, { DEBUG } from '../utils/logger';
import User from './user';
import Credentials from './credentials';
import Playlist from './playlist';

const logger = new Logger(DEBUG.WARN, '/db');

const MySQLStore = MySQLSession(require('express-session'));

class DB {
  private static instance: DB;
  private static sessionStore?: Store;

  private _credentials: Credentials;
  private _playlist: Playlist;
  private _user: User;
  private pool: Pool;

  private constructor() {
    this.pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      database: DB_NAME,
      port: DB_PORT,
      password: DB_PASSWORD,
    });
    this._credentials = new Credentials(this.pool);
    this._playlist = new Playlist(this.pool);
    this._user = new User(this.pool);
  }

  static {
    this.instance = new DB();
  }

  public static getInstance(): DB {
    return DB.instance;
  }

  public get credentials(): Credentials {
    return this._credentials;
  }
  public get playlist(): Playlist {
    return this._playlist;
  }
  public get user(): User {
    return this._user;
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
        const creationPromises = creationScript
          .toString()
          .split(';')
          .slice(0, creationScript.toString().split(';').length - 1)
          .map((statement) => this.pool.query(statement));
        Promise.all(creationPromises)
          .then(() => res())
          .catch(rej);
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
}

export default DB;
