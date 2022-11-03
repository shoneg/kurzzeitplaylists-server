import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import DB from '.';
import { User as AppUser, Playlist as AppPlaylist } from '../types';
import Logger, { DEBUG } from '../utils/logger';
import { PlaylistModel, UserModel } from './models';
import Playlist from './playlist';

const logger = new Logger(DEBUG.WARN, '/db/user');

class User {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  static model2User(dbUser: UserModel): Promise<AppUser> {
    const db = DB.getInstance();
    const { displayName, spotifyId } = dbUser;
    return new Promise<AppUser>((res, rej) => {
      db.credentials
        .get(spotifyId)
        .then((credentials) => {
          const user = new AppUser(credentials, displayName, spotifyId);
          res(user);
        })
        .catch(rej);
    });
  }

  insert(user: AppUser): Promise<void> {
    const { credentials, displayName, spotifyId } = user;
    const db = DB.getInstance();
    return new Promise<void>((res, rej) => {
      db.credentials
        .insert(credentials, spotifyId)
        .then(() => {
          this.pool
            .query<ResultSetHeader>('INSERT INTO user (displayName,spotifyId)VALUES ( ?, ? )', [displayName, spotifyId])
            .then((insertionResult) => {
              const { affectedRows } = insertionResult[0];
              if (affectedRows === 1) {
                res();
              } else {
                logger.warn(`unexpectedly ${affectedRows} rows where inserted into user instead of 1.`);
                res();
              }
            })
            .catch((err) => {
              logger.error('Got error while inserting user:', err);
              rej("Couldn't insert user");
            });
        })
        .catch(rej);
    });
  }

  exist(id: string): Promise<AppUser | false> {
    return new Promise<AppUser | false>((res) =>
      this.pool
        .query<RowDataPacket[]>('SELECT * FROM user WHERE spotifyId = ?', [id])
        .then((result) => {
          const count = result[0].length;
          if (count >= 1) {
            if (count > 1) {
              logger.warn(`Seems like there's ${count} (more than 1) user with id '${id}'`);
            }
            const dbUser = result[0][0] as UserModel;
            const user = User.model2User(dbUser);
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

  get(id: string): Promise<AppUser> {
    return new Promise<AppUser>((res, rej) => {
      this.pool
        .query<RowDataPacket[]>('SELECT * FROM user WHERE spotifyId = ?', [id])
        .then((queryResult) => {
          const count = queryResult[0].length;
          if (count >= 1) {
            logger.warn(`There were found ${count} users with id='${id}'`);
            const dbUser = queryResult[0][0] as UserModel;
            User.model2User(dbUser).then(res).catch(rej);
          } else {
            logger.warn(`unexpectedly ${count} users where inserted into user instead of 1.`);
            rej('Cannot find user');
          }
        })
        .catch((err) => {
          logger.error(`Got an unexpected error while getting user with id='${id}':`, err);
          rej('Error while querying user');
        });
    });
  }

  update(user: Pick<AppUser, 'spotifyId'> & Partial<Omit<AppUser, 'spotifyId'>>): Promise<AppUser> {
    const db = DB.getInstance();
    const { spotifyId, displayName, credentials = {} } = user;
    return new Promise<AppUser>((res, rej) => {
      db.credentials
        .update(credentials, spotifyId)
        .then(() => {
          if (displayName) {
            this.pool
              .query<ResultSetHeader>('UPDATE user SET displayName = ? WHERE spotifyId = ?', [displayName, spotifyId])
              .then((result) => {
                const { affectedRows } = result[0];
                if (affectedRows >= 1) {
                  if (affectedRows > 1) {
                    logger.error(
                      `Seems like there's ${affectedRows} (more than 1) user with id '${spotifyId}', now all the false one have wrong credentials`
                    );
                  }
                  db.user.get(spotifyId).then(res).catch(rej);
                }
              })
              .catch((err) => {
                logger.error(`Unexpectedly we couldn't update user with id='${spotifyId}' and got error:`, err);
                rej(`Couldn't update user, got an error`);
              });
          } else {
            db.user.get(spotifyId).then(res).catch(rej);
          }
        })
        .catch(rej);
    });
  }

  getPlaylists(user: AppUser | string): Promise<AppPlaylist[]> {
    let userId: string;
    if (typeof user === 'string') {
      userId = user;
    } else {
      userId = user.spotifyId;
    }
    return new Promise<AppPlaylist[]>((res, rej) => {
      this.pool
        .query<RowDataPacket[]>('SELECT * FROM playlist WHERE owner = ?', [userId])
        .then((result) => {
          const dbPlaylists = result[0] as PlaylistModel[];
          const playlists = dbPlaylists.map(Playlist.model2Playlist);
          res(playlists);
        })
        .catch((err) => {
          logger.error(`Got an unexpected error while getting playlists of user with id='${userId}':`, err);
          rej('Cannot get playlists');
        });
    });
  }
}

export default User;
