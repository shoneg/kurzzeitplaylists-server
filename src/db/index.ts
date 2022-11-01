import { readFile } from 'fs';
import { Store } from 'express-session';
import moment from 'moment';
import mysql, { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import MySQLSession from 'express-mysql-session';

import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER, SESSION_TIMEOUT } from '../config';

import Logger, { DEBUG } from '../utils/logger';
import { SpotifyCredentials, User } from '../types';
import { DBUser } from './types';

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

  //* --------------------------
  //* |         user           |
  //* --------------------------

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
          }
          logger.warn(`unexpectedly ${result[0].affectedRows} where inserted into user instead of 1.`);
          res();
        })
        .catch((err) => {
          logger.error('Got Error while inserting user:', err);
          rej();
        });
    });
  }

  public getUser(id: string): Promise<User> {
    return new Promise<User>((res, rej) => {
      this.pool
        .query<RowDataPacket[]>('SELECT * FROM user WHERE spotifyId = ? LIMIT 1', [id])
        .then((result) => {
          const dbUser = result[0][0];
          const { accessToken, refreshToken, expiresAt, displayName, spotifyId } = dbUser as DBUser;
          const credentials: SpotifyCredentials = { accessToken, refreshToken, expiresAt: moment(expiresAt) };
          const user: User = { credentials, displayName, spotifyId };
          res(user);
        })
        .catch((err) => {
          logger.error(`Got an unexpected error while getting user with id='${id}':`, err);
          rej('Cannot get user');
        });
    });
  }

  public isUser(id: string): Promise<boolean> {
    return new Promise<boolean>((res) =>
      this.pool
        .query<RowDataPacket[]>('SELECT COUNT(spotifyId) FROM user WHERE spotifyId = ?', [id])
        .then((result) => {
          const count = result[0][0]['COUNT(spotifyId)'] as number;
          if (count === 1) {
            res(true);
          } else if (count > 1) {
            logger.warn(`Seems like there's ${count} (more than 1) user with id '${id}'`);
            res(true);
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
}
