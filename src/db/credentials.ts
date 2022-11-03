import { Moment } from 'moment';
import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import DB from '.';
import { SpotifyCredentials } from '../types';
import Logger, { DEBUG } from '../utils/logger';
import { CredentialsModel } from './models';

const logger = new Logger(DEBUG.WARN, '/db/credentials');

class Credentials {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  static model2Credentials(credentials: CredentialsModel): SpotifyCredentials {
    const { accessToken, expiresAt, refreshToken, userId } = credentials;
    const ret = new SpotifyCredentials(accessToken, expiresAt, refreshToken, userId);
    return ret;
  }

  get(userId: string): Promise<SpotifyCredentials> {
    return new Promise<SpotifyCredentials>((res, rej) => {
      this.pool
        .query<RowDataPacket[]>('SELECT * FROM credentials WHERE userId = ?', [userId])
        .then((queryResult) => {
          const count = queryResult[0].length;
          if (count >= 1) {
            if (count > 1) {
              logger.warn(`Got ${count} instead of 1 credentials for id='${userId}'`);
            }
            const credentials = Credentials.model2Credentials(queryResult[0][0] as CredentialsModel);
            res(credentials);
          } else {
            rej(`Could not find credentials with id='${userId}'`);
          }
        })
        .catch((err) => {
          logger.error('Got an unexpected error while looking for credentials:', err);
          rej('Got error while querying');
        });
    });
  }

  getAllExpiresBefore(expiresBefore: Moment): Promise<SpotifyCredentials[]> {
    return new Promise<SpotifyCredentials[]>((res, rej) => {
      this.pool
        .query<RowDataPacket[]>('SELECT * FROM credentials WHERE expiresAt < ?', [expiresBefore.toDate()])
        .then((queryResult) => {
          const dbCredentials = queryResult[0] as CredentialsModel[];
          const credentialPromises = dbCredentials.map(Credentials.model2Credentials);
          Promise.all(credentialPromises).then(res).catch(rej);
        })
        .catch((err) => {
          logger.error('Got an unexpected error while getting credentials:', err);
          rej('Error while querying credentials');
        });
    });
  }

  insert(credentials: SpotifyCredentials, spotifyId: string): Promise<void> {
    const { accessToken, expiresAt, refreshToken } = credentials;
    return new Promise<void>((res, rej) => {
      this.pool
        .query<ResultSetHeader>(
          `INSERT INTO credentials (accessToken, expiresAt, refreshToken, userId)
        VALUES ( ?, ?, ?, ? )`,
          [accessToken, expiresAt.toDate(), refreshToken, spotifyId]
        )
        .then((insertionResult) => {
          const { affectedRows } = insertionResult[0];
          if (affectedRows >= 1) {
            if (affectedRows > 1) {
              logger.warn(`Instead of 1 row, we've inserted ${affectedRows}`);
            }
            res();
          } else {
            logger.warn('We have inserted 0 instead of 1 row into credentials');
            rej();
          }
        })
        .catch((err) => {
          logger.error('Got an unexpected error while inserting credentials:', err);
          rej('Insertion failed unexpected');
        });
    });
  }

  update(credentials: Partial<SpotifyCredentials>, userId: string): Promise<SpotifyCredentials> {
    const db = DB.getInstance();
    const { accessToken, expiresAt, refreshToken } = credentials;
    if (accessToken || expiresAt || refreshToken) {
      let query = 'UPDATE credentials SET ';
      let values: (string | Date)[] = [];
      (
        [
          { v: accessToken, n: 'accessToken' },
          { v: expiresAt?.toDate(), n: 'expiresAt' },
          { v: refreshToken, n: 'refreshToken' },
        ] as { v: string | Date; n: string }[]
      ).forEach(({ v, n }) => {
        if (v) {
          query += n + ' = ?, ';
          values.push(v);
        }
      });
      query = query.substring(0, query.length - 2) + ' WHERE userId = ?';
      values.push(userId);
      return new Promise<SpotifyCredentials>((res, rej) => {
        this.pool
          .query<ResultSetHeader>(query, values)
          .then((updateResult) => {
            const { affectedRows } = updateResult[0];
            if (affectedRows >= 1) {
              if (affectedRows > 1) {
                logger.warn(`Instead of 1 row, we've updated ${affectedRows}`);
              }
              db.credentials.get(userId).then(res).catch(rej);
            } else {
              logger.warn('We have updated 0 instead of 1 row of credentials');
              rej('Could not find credentials');
            }
          })
          .catch((err) => {
            logger.error(`Got an unexpected error while updating credentials with id='${userId}':`, err);
            rej('Error while updating');
          });
      });
    } else {
      return db.credentials.get(userId);
    }
  }
}

export default Credentials;
