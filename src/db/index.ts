import { Pool as PromisePool } from 'mysql2/promise';
import { readFile } from 'fs';
import mysql, { Pool } from 'mysql2/promise';

import { DB_HOST, DB_NAME, DB_PASSWORD, DB_PORT, DB_USER } from '../config';

import Logger, { DEBUG } from '../utils/logger';

const logger = new Logger(DEBUG.WARN, '/db');

export class DB {
  private static instance: DB;
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
}
