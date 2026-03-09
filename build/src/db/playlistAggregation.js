"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const logger_1 = __importStar(require("../utils/logger"));
const logger = new logger_1.default(logger_1.DEBUG.WARN, '/db/playlistAggregation');
class PlaylistAggregation {
    constructor(pool) {
        this.pool = pool;
    }
    rowsToRules(rows) {
        const grouped = new Map();
        rows.forEach((row) => {
            const existing = grouped.get(row.targetSpotifyId);
            if (existing) {
                if (row.sourceSpotifyId) {
                    existing.sourcePlaylistIds.push(row.sourceSpotifyId);
                }
            }
            else {
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
    getForUser(userId) {
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
        return this.pool.query(query, [userId]).then((result) => this.rowsToRules(result[0]));
    }
    getAll() {
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
        return this.pool.query(query).then((result) => this.rowsToRules(result[0]));
    }
    getForTarget(targetSpotifyId, ownerId) {
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
        return this.pool.query(query, values).then((result) => {
            const rules = this.rowsToRules(result[0]);
            if (rules.length < 1) {
                return Promise.reject('Aggregation rule not found');
            }
            return rules[0];
        });
    }
    upsert(input) {
        const { mode, ownerId, sourcePlaylistIds, targetSpotifyId } = input;
        return this.pool
            .getConnection()
            .then((connection) => __awaiter(this, void 0, void 0, function* () {
            try {
                yield connection.beginTransaction();
                const ownerCheck = yield connection.query('SELECT spotifyId FROM playlist WHERE spotifyId = ? AND owner = ?', [targetSpotifyId, ownerId]);
                if (ownerCheck[0].length < 1) {
                    throw new Error('Target playlist does not belong to user');
                }
                yield connection.query(`
            INSERT INTO playlist_aggregation(targetSpotifyId, mode)
            VALUES(?, ?)
            ON DUPLICATE KEY UPDATE mode = VALUES(mode)
            `, [targetSpotifyId, mode]);
                yield connection.query('DELETE FROM playlist_aggregation_source WHERE targetSpotifyId = ?', [
                    targetSpotifyId,
                ]);
                if (sourcePlaylistIds.length > 0) {
                    let insertQuery = `
              INSERT INTO playlist_aggregation_source(targetSpotifyId, sourceSpotifyId, position)
              VALUES
            `;
                    const insertValues = [];
                    sourcePlaylistIds.forEach((sourceSpotifyId, index) => {
                        insertQuery += '(?, ?, ?),';
                        insertValues.push(targetSpotifyId, sourceSpotifyId, index);
                    });
                    insertQuery = insertQuery.substring(0, insertQuery.length - 1);
                    yield connection.query(insertQuery, insertValues);
                }
                yield connection.commit();
                return {
                    mode,
                    ownerId,
                    sourcePlaylistIds: [...sourcePlaylistIds],
                    targetSpotifyId,
                };
            }
            catch (err) {
                yield connection.rollback();
                logger.error('Unexpected error while upserting playlist aggregation:', err);
                return Promise.reject(err);
            }
            finally {
                connection.release();
            }
        }))
            .catch((err) => {
            logger.error('Could not upsert playlist aggregation:', err);
            return Promise.reject(err);
        });
    }
    delete(targetSpotifyId, ownerId) {
        let query = `
      DELETE pa
      FROM playlist_aggregation pa
      INNER JOIN playlist p ON p.spotifyId = pa.targetSpotifyId
      WHERE pa.targetSpotifyId = ?
    `;
        const values = [targetSpotifyId];
        if (ownerId) {
            query += ' AND p.owner = ?';
            values.push(ownerId);
        }
        return this.pool
            .query(query, values)
            .then((result) => result[0].affectedRows > 0)
            .catch((err) => {
            logger.error(`Could not delete playlist aggregation for target='${targetSpotifyId}':`, err);
            return Promise.reject(err);
        });
    }
}
exports.default = PlaylistAggregation;
