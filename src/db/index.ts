import { readFile } from 'fs';
import session, { Store } from 'express-session';
import moment from 'moment';
import mysql, { FieldPacket, OkPacket, Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import MySQLSession from 'express-mysql-session';

import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER, SESSION_TIMEOUT } from '../config';

import Logger, { DEBUG } from '../utils/logger';
import User from './user';
import Credentials from './credentials';
import Playlist from './playlist';

const logger = new Logger(DEBUG.WARN, '/db');

const MySQLStore = MySQLSession(session);

/**
 * Singleton database access layer and session store factory.
 */
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

  /**
   * Return the shared DB instance.
   */
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

  /**
   * Execute a raw SQL query against the pool.
   */
  public query<T extends RowDataPacket[][] | RowDataPacket[] | OkPacket | OkPacket[] | ResultSetHeader>(
    sql: string,
    values: any | any[] | { [param: string]: any }
  ): Promise<[T, FieldPacket[]]> {
    return this.pool.query<T>(sql, values);
  }

  /**
   * Smoke-test the DB connection.
   */
  public testConnection(): Promise<boolean> {
    return new Promise<boolean>((res) =>
      this.pool
        .query('SELECT * FROM user LIMIT 1')
        .then(() => res(true))
        .catch(() => res(false))
    );
  }

  /**
   * Create schema if missing using `src/db/createDb.sql`.
   */
  public crateDbIfNotExist(): Promise<void> {
    return new Promise<void>((res, rej) => {
      readFile('src/db/createDb.sql', (readFileErr, creationScript) => {
        if (readFileErr) {
          rej(readFileErr);
          return;
        }
        const statements = creationScript
          .toString()
          .split(';')
          .map((statement) => statement.trim())
          .filter((statement) => statement.length > 0);
        const creationPromises = statements.map((statement) => this.pool.query(statement));
        Promise.all(creationPromises)
          .then(() => res())
          .catch(rej);
      });
    });
  }

  /**
   * Lazily initialize the session store.
   */
  public getSessionStore(): Store {
    if (!DB.sessionStore) {
      const store = new MySQLStore({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        database: DB_NAME,
        port: DB_PORT,
        checkExpirationInterval: moment.duration(60, 's').asMilliseconds(),
        expiration: moment.duration(SESSION_TIMEOUT, 's').asMilliseconds(),
      });
      if (typeof (store as unknown as { on?: (evt: string, cb: (err: Error) => void) => void }).on === 'function') {
        (store as unknown as { on: (evt: string, cb: (err: Error) => void) => void }).on('error', (err: Error) => {
          logger.error('Got error while init of sessionStore:', err);
        });
      }
      DB.sessionStore = store as Store;
    }
    return DB.sessionStore;
  }
}

export default DB;
