import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { AggregationMode, AggregationRule } from '../types';
import Logger, { DEBUG } from '../utils/logger';

const logger = new Logger(DEBUG.WARN, '/db/playlistAggregation');

type AggregationRow = RowDataPacket & {
  mode: AggregationMode;
  ownerId: string;
  sourceSpotifyId: string | null;
  targetSpotifyId: string;
};

class PlaylistAggregation {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  private rowsToRules(rows: AggregationRow[]): AggregationRule[] {
    const grouped = new Map<string, AggregationRule>();
    rows.forEach((row) => {
      const existing = grouped.get(row.targetSpotifyId);
      if (existing) {
        if (row.sourceSpotifyId) {
          existing.sourcePlaylistIds.push(row.sourceSpotifyId);
        }
      } else {
        grouped.set(row.targetSpotifyId, {
          mode: row.mode,
          ownerId: row.ownerId,
          sourcePlaylistIds: row.sourceSpotifyId ? [row.sourceSpotifyId] : [],
          targetSpotifyId: row.targetSpotifyId,
        });
      }
    });
    return [...grouped.values()];
  }

  public getForUser(userId: string): Promise<AggregationRule[]> {
    const query = `
      SELECT
        pa.targetSpotifyId,
        pa.mode,
        p.owner AS ownerId,
        pas.sourceSpotifyId
      FROM playlist_aggregation pa
      INNER JOIN playlist p ON p.spotifyId = pa.targetSpotifyId
      LEFT JOIN playlist_aggregation_source pas ON pa.targetSpotifyId = pas.targetSpotifyId
      WHERE p.owner = ?
      ORDER BY pa.targetSpotifyId, pas.position ASC
    `;
    return this.pool.query<AggregationRow[]>(query, [userId]).then((result) => this.rowsToRules(result[0]));
  }

  public getAll(): Promise<AggregationRule[]> {
    const query = `
      SELECT
        pa.targetSpotifyId,
        pa.mode,
        p.owner AS ownerId,
        pas.sourceSpotifyId
      FROM playlist_aggregation pa
      INNER JOIN playlist p ON p.spotifyId = pa.targetSpotifyId
      LEFT JOIN playlist_aggregation_source pas ON pa.targetSpotifyId = pas.targetSpotifyId
      ORDER BY pa.targetSpotifyId, pas.position ASC
    `;
    return this.pool.query<AggregationRow[]>(query).then((result) => this.rowsToRules(result[0]));
  }

  public getForTarget(targetSpotifyId: string, ownerId?: string): Promise<AggregationRule> {
    const query = `
      SELECT
        pa.targetSpotifyId,
        pa.mode,
        p.owner AS ownerId,
        pas.sourceSpotifyId
      FROM playlist_aggregation pa
      INNER JOIN playlist p ON p.spotifyId = pa.targetSpotifyId
      LEFT JOIN playlist_aggregation_source pas ON pa.targetSpotifyId = pas.targetSpotifyId
      WHERE pa.targetSpotifyId = ? ${ownerId ? 'AND p.owner = ?' : ''}
      ORDER BY pas.position ASC
    `;
    const values = ownerId ? [targetSpotifyId, ownerId] : [targetSpotifyId];
    return this.pool.query<AggregationRow[]>(query, values).then((result) => {
      const rules = this.rowsToRules(result[0]);
      if (rules.length < 1) {
        return Promise.reject('Aggregation rule not found');
      }
      return rules[0];
    });
  }

  public upsert(input: {
    mode: AggregationMode;
    ownerId: string;
    sourcePlaylistIds: string[];
    targetSpotifyId: string;
  }): Promise<AggregationRule> {
    const { mode, ownerId, sourcePlaylistIds, targetSpotifyId } = input;
    return this.pool
      .getConnection()
      .then(async (connection) => {
        try {
          await connection.beginTransaction();
          const ownerCheck = await connection.query<RowDataPacket[]>(
            'SELECT spotifyId FROM playlist WHERE spotifyId = ? AND owner = ?',
            [targetSpotifyId, ownerId]
          );
          if (ownerCheck[0].length < 1) {
            throw new Error('Target playlist does not belong to user');
          }
          await connection.query<ResultSetHeader>(
            `
            INSERT INTO playlist_aggregation(targetSpotifyId, mode)
            VALUES(?, ?)
            ON DUPLICATE KEY UPDATE mode = VALUES(mode)
            `,
            [targetSpotifyId, mode]
          );
          await connection.query<ResultSetHeader>('DELETE FROM playlist_aggregation_source WHERE targetSpotifyId = ?', [
            targetSpotifyId,
          ]);
          if (sourcePlaylistIds.length > 0) {
            let insertQuery = `
              INSERT INTO playlist_aggregation_source(targetSpotifyId, sourceSpotifyId, position)
              VALUES
            `;
            const insertValues: (number | string)[] = [];
            sourcePlaylistIds.forEach((sourceSpotifyId, index) => {
              insertQuery += '(?, ?, ?),';
              insertValues.push(targetSpotifyId, sourceSpotifyId, index);
            });
            insertQuery = insertQuery.substring(0, insertQuery.length - 1);
            await connection.query<ResultSetHeader>(insertQuery, insertValues);
          }
          await connection.commit();
          return {
            mode,
            ownerId,
            sourcePlaylistIds: [...sourcePlaylistIds],
            targetSpotifyId,
          };
        } catch (err) {
          await connection.rollback();
          logger.error('Unexpected error while upserting playlist aggregation:', err);
          return Promise.reject(err);
        } finally {
          connection.release();
        }
      })
      .catch((err) => {
        logger.error('Could not upsert playlist aggregation:', err);
        return Promise.reject(err);
      });
  }

  public delete(targetSpotifyId: string, ownerId?: string): Promise<boolean> {
    let query = `
      DELETE pa
      FROM playlist_aggregation pa
      INNER JOIN playlist p ON p.spotifyId = pa.targetSpotifyId
      WHERE pa.targetSpotifyId = ?
    `;
    const values: string[] = [targetSpotifyId];
    if (ownerId) {
      query += ' AND p.owner = ?';
      values.push(ownerId);
    }
    return this.pool
      .query<ResultSetHeader>(query, values)
      .then((result) => result[0].affectedRows > 0)
      .catch((err) => {
        logger.error(`Could not delete playlist aggregation for target='${targetSpotifyId}':`, err);
        return Promise.reject(err);
      });
  }
}

export default PlaylistAggregation;
