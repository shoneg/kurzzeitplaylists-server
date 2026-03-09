import { RequestHandler } from 'express';
import * as https from 'https';
import moment from 'moment';
import { aggregateConfiguredPlaylistForUser } from '../../aggregation';
import DB from '../../db';
import { getSpotify, getSpotifyClientCredentials } from '../../spotifyApi';
import { AggregationRule, isAggregationMode, Playlist, User } from '../../types';
import Logger, { DEBUG } from '../../utils/logger';
import { recognizePlaylistsOfUser } from '../playlists/service';

const asString = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;
const logger = new Logger(DEBUG.WARN, '/handlers/api');

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
};

const toAggregationRuleResponse = (rule: AggregationRule) => ({
  mode: rule.mode,
  sourcePlaylistIds: [...rule.sourcePlaylistIds],
  targetSpotifyId: rule.targetSpotifyId,
});

const dedupeSpotifyPlaylists = (
  playlists: SpotifyApi.PlaylistObjectSimplified[]
): SpotifyApi.PlaylistObjectSimplified[] => {
  const seen = new Set<string>();
  const deduped: SpotifyApi.PlaylistObjectSimplified[] = [];
  playlists.forEach((playlist) => {
    if (!seen.has(playlist.id)) {
      seen.add(playlist.id);
      deduped.push(playlist);
    }
  });
  return deduped;
};

const getAccessibleSpotifyPlaylists = (user: User): Promise<SpotifyApi.PlaylistObjectSimplified[]> =>
  Playlist.getMany(0, 50, getSpotify(user)).then((playlists) =>
    dedupeSpotifyPlaylists(playlists).sort((a, b) => a.name.localeCompare(b.name))
  );

const playlistMarketFallbacks = [undefined, 'from_token', 'DE', 'US', 'SE', 'GB', 'AT', 'CH'] as const;

const requestJson = (url: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: { Accept: 'application/json' },
      },
      (response) => {
        if ((response.statusCode ?? 500) >= 400) {
          response.resume();
          reject(new Error(`Request to '${url}' failed with status=${response.statusCode}`));
          return;
        }
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString('utf-8');
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(5000, () => req.destroy(new Error(`Request to '${url}' timed out`)));
  });

const tryGetPlaylistWithMarkets = async (
  spotify: ReturnType<typeof getSpotify>,
  playlistId: string,
  fields: string
): Promise<SpotifyApi.SinglePlaylistResponse | undefined> => {
  for (const market of playlistMarketFallbacks) {
    try {
      const result = await spotify.getPlaylist(playlistId, market ? { fields, market } : { fields });
      if (result.statusCode === 200) {
        return result.body as SpotifyApi.SinglePlaylistResponse;
      }
    } catch (_err) {}
  }
  return undefined;
};

const tryGetPlaylistTracksWithMarkets = async (
  spotify: ReturnType<typeof getSpotify>,
  playlistId: string
): Promise<boolean> => {
  for (const market of playlistMarketFallbacks) {
    try {
      const result = await spotify.getPlaylistTracks(
        playlistId,
        market
          ? { limit: 1, offset: 0, fields: 'items(track(uri)),next', market }
          : { limit: 1, offset: 0, fields: 'items(track(uri)),next' }
      );
      if (result.statusCode === 200) {
        return true;
      }
    } catch (_err) {}
  }
  return false;
};

const resolvePlaylistNameFromOEmbed = async (playlistId: string): Promise<string | undefined> => {
  const url = `https://open.spotify.com/oembed?url=${encodeURIComponent(`spotify:playlist:${playlistId}`)}`;
  try {
    const data = (await requestJson(url)) as { title?: unknown };
    if (typeof data.title === 'string' && data.title.trim().length > 0) {
      return data.title.trim();
    }
  } catch (_err) {}
  return undefined;
};

const canAccessPlaylistById = async (spotify: ReturnType<typeof getSpotify>, playlistId: string): Promise<boolean> => {
  const fromUserToken = await tryGetPlaylistWithMarkets(spotify, playlistId, 'id');
  if (fromUserToken) {
    return true;
  }
  const fromUserTokenTracks = await tryGetPlaylistTracksWithMarkets(spotify, playlistId);
  if (fromUserTokenTracks) {
    return true;
  }
  try {
    const publicSpotify = await getSpotifyClientCredentials();
    const fromAppToken = await tryGetPlaylistWithMarkets(publicSpotify, playlistId, 'id');
    if (fromAppToken) {
      return true;
    }
    const fromAppTokenTracks = await tryGetPlaylistTracksWithMarkets(publicSpotify, playlistId);
    if (fromAppTokenTracks) {
      return true;
    }
  } catch (_publicErr) {}
  const fromOEmbed = await resolvePlaylistNameFromOEmbed(playlistId);
  if (fromOEmbed) {
    return true;
  }
  logger.warn(`Source playlist '${playlistId}' is not accessible via user/app token nor oEmbed`);
  return false;
};

const resolvePlaylistNameById = async (
  spotify: ReturnType<typeof getSpotify>,
  playlistId: string
): Promise<{ name: string; spotifyId: string } | undefined> => {
  const fromUserToken = await tryGetPlaylistWithMarkets(spotify, playlistId, 'id,name');
  if (fromUserToken?.id && fromUserToken?.name) {
    return {
      name: fromUserToken.name,
      spotifyId: fromUserToken.id,
    };
  }
  try {
    const publicSpotify = await getSpotifyClientCredentials();
    const fromAppToken = await tryGetPlaylistWithMarkets(publicSpotify, playlistId, 'id,name');
    if (fromAppToken?.id && fromAppToken?.name) {
      return {
        name: fromAppToken.name,
        spotifyId: fromAppToken.id,
      };
    }
  } catch (_err) {}
  const oEmbedName = await resolvePlaylistNameFromOEmbed(playlistId);
  if (oEmbedName) {
    return {
      name: oEmbedName,
      spotifyId: playlistId,
    };
  }
  return undefined;
};

/**
 * Convert a playlist model to a client-safe summary payload.
 */
const toPlaylistSummary = (playlist: Playlist) => ({
  spotifyId: playlist.spotifyId,
  name: playlist.name,
  numberOfTracks: playlist.numberOfTracks,
  maxTrackAge: playlist.maxTrackAge ?? null,
  maxTracks: playlist.maxTracks ?? null,
  discardPlaylist: playlist.discardPlaylist ?? null,
});

/**
 * Return current session info for the client shell.
 */
export const session: RequestHandler = (req, res) => {
  if (!req.user) {
    res.json({ authenticated: false });
    return;
  }

  const user = User.fromExpress(req.user as Express.User);
  res.json({
    authenticated: true,
    user: {
      displayName: user.displayName,
      spotifyId: user.spotifyId,
    },
  });
};

/**
 * Return a list of playlists for the authenticated user.
 */
export const playlists: RequestHandler = (req, res, next) => {
  const db = DB.getInstance();
  const user = User.fromExpress(req.user as Express.User);
  db.user
    .getPlaylists(user, 'lexicographic_az')
    .then((list) => res.json(list.map(toPlaylistSummary)))
    .catch(next);
};

/**
 * Return configured aggregation rules and available playlists.
 */
export const aggregations: RequestHandler = (req, res, next) => {
  const db = DB.getInstance();
  const user = User.fromExpress(req.user as Express.User);
  Promise.all([
    db.playlistAggregation.getForUser(user.spotifyId),
    db.user.getPlaylists(user, 'lexicographic_az'),
    getAccessibleSpotifyPlaylists(user),
  ])
    .then(async ([rules, targetPlaylists, sourcePlaylists]) => {
      const sourceMap = new Map<string, { name: string; spotifyId: string }>();
      sourcePlaylists.forEach((playlist) => {
        sourceMap.set(playlist.id, { name: playlist.name, spotifyId: playlist.id });
      });
      const missingRuleSources = [...new Set(rules.flatMap((rule) => rule.sourcePlaylistIds))].filter(
        (sourceId) => !sourceMap.has(sourceId)
      );
      if (missingRuleSources.length > 0) {
        const spotify = getSpotify(user);
        const resolved = await Promise.all(
          missingRuleSources.map((sourceId) => resolvePlaylistNameById(spotify, sourceId))
        );
        resolved.forEach((entry) => {
          if (entry) {
            sourceMap.set(entry.spotifyId, entry);
          }
        });
      }
      const sortedSourceOptions = [...sourceMap.values()].sort((a, b) => a.name.localeCompare(b.name));
      return res.json({
        playlists: sortedSourceOptions,
        targetPlaylists: targetPlaylists.map((playlist) => ({
          name: playlist.name,
          spotifyId: playlist.spotifyId,
        })),
        rules: rules.map(toAggregationRuleResponse),
      });
    })
    .catch(next);
};

/**
 * Return playlist detail along with discard options and oldest track info.
 */
export const playlistDetail: RequestHandler = (req, res, next) => {
  const id = asString(req.params.id);
  if (!id) {
    res.status(400).json({ message: 'Missing playlist id' });
    return;
  }
  const user = User.fromExpress(req.user as Express.User);
  const db = DB.getInstance();

  db.playlist
    .get(id)
    .then((playlist) =>
      playlist
        .refresh(user.credentials, true)
        .then(() =>
          db.playlist
            .get(id)
            .then((fresh) =>
              db.user.getPlaylists(user, 'lexicographic_az').then((playlists) => {
                const oldestTrackDate = fresh.oldestTrack.format('YYYY-MM-DD');
                const ageDays = moment().diff(fresh.oldestTrack, 'd');
                res.json({
                  playlist: {
                    ...toPlaylistSummary(fresh),
                    oldestTrack: {
                      date: oldestTrackDate,
                      ageDays,
                    },
                  },
                  discardOptions: playlists
                    .filter((playlistOption) => playlistOption.spotifyId !== fresh.spotifyId)
                    .map((playlistOption) => ({
                      spotifyId: playlistOption.spotifyId,
                      name: playlistOption.name,
                    })),
                });
              })
            )
            .catch(next)
        )
        .catch(next)
    )
    .catch(next);
};

/**
 * Update cleanup settings for a playlist.
 */
export const updatePlaylist: RequestHandler = (req, res, next) => {
  const id = asString(req.params.id);
  if (!id) {
    res.status(400).json({ message: 'Missing playlist id' });
    return;
  }
  const user = User.fromExpress(req.user as Express.User);
  const { maxAge, maxTracks, discardPlaylist } = req.body as {
    maxAge?: number | null;
    maxTracks?: number | null;
    discardPlaylist?: string | null;
  };
  const db = DB.getInstance();

  db.playlist
    .update(
      {
        spotifyId: id,
        maxTrackAge: maxAge ?? null,
        maxTracks: maxTracks ?? null,
        discardPlaylist: discardPlaylist ?? null,
      },
      user
    )
    .then(() => res.json({ ok: true }))
    .catch(next);
};

/**
 * Create or update an aggregation rule and run it immediately once.
 */
export const upsertAggregation: RequestHandler = (req, res, next) => {
  const user = User.fromExpress(req.user as Express.User);
  const db = DB.getInstance();
  const { mode, newTargetName, targetSpotifyId: requestTargetId } = req.body as {
    mode?: string;
    newTargetName?: string;
    targetSpotifyId?: string;
  };
  const sourcePlaylistIds = asStringArray((req.body as { sourcePlaylistIds?: unknown }).sourcePlaylistIds);

  if (!isAggregationMode(mode)) {
    res.status(400).json({ message: 'Invalid aggregation mode' });
    return;
  }
  if (sourcePlaylistIds.length < 1) {
    res.status(400).json({ message: 'At least one source playlist must be provided' });
    return;
  }
  if (new Set(sourcePlaylistIds).size !== sourcePlaylistIds.length) {
    res.status(400).json({ message: 'Duplicate source playlists are not allowed' });
    return;
  }
  if (requestTargetId && typeof newTargetName === 'string' && newTargetName.trim().length > 0) {
    res.status(400).json({ message: 'Provide either targetSpotifyId or newTargetName, not both' });
    return;
  }
  if (!requestTargetId && (!newTargetName || newTargetName.trim().length < 1)) {
    res.status(400).json({ message: 'Missing target playlist identifier' });
    return;
  }

  Promise.all([db.user.getPlaylists(user), getAccessibleSpotifyPlaylists(user)])
    .then(async ([playlists, accessiblePlaylists]) => {
      const spotify = getSpotify(user);
      let targetSpotifyId = requestTargetId;
      const ownPlaylistIds = new Set(playlists.map((playlist) => playlist.spotifyId));
      const accessibleSourceIds = new Set(accessiblePlaylists.map((playlist) => playlist.id));

      if (!targetSpotifyId) {
        const created = await spotify.createPlaylist((newTargetName as string).trim(), {
          collaborative: false,
          description: 'Managed by Kurzzeitplaylists aggregation',
          public: false,
        });
        const createdPlaylist = Playlist.fromApiObj(created.body as SpotifyApi.PlaylistObjectSimplified);
        try {
          await db.playlist.insert([createdPlaylist]);
        } catch (_err) {
          // If the playlist row already exists, we can continue with the existing target.
        }
        targetSpotifyId = created.body.id;
        ownPlaylistIds.add(targetSpotifyId);
        accessibleSourceIds.add(targetSpotifyId);
      }

      if (!targetSpotifyId || !ownPlaylistIds.has(targetSpotifyId)) {
        res.status(400).json({ message: 'Target playlist must belong to the authenticated user' });
        return;
      }
      if (sourcePlaylistIds.includes(targetSpotifyId)) {
        res.status(400).json({ message: 'Target playlist cannot be part of source playlists' });
        return;
      }
      const unknownSourceIds = sourcePlaylistIds.filter((sourceSpotifyId) => !accessibleSourceIds.has(sourceSpotifyId));
      if (unknownSourceIds.length > 0) {
        const accessChecks = await Promise.all(
          unknownSourceIds.map((sourceSpotifyId) => canAccessPlaylistById(spotify, sourceSpotifyId))
        );
        const stillUnknown: string[] = [];
        unknownSourceIds.forEach((sourceSpotifyId, index) => {
          if (accessChecks[index]) {
            accessibleSourceIds.add(sourceSpotifyId);
          } else {
            stillUnknown.push(sourceSpotifyId);
          }
        });
        if (stillUnknown.length > 0) {
          logger.warn(`Sources not verifiable during save for user='${user.spotifyId}': ${stillUnknown.join(', ')}`);
          res.status(400).json({
            message: `All source playlists must be accessible to the authenticated user. Not accessible: ${stillUnknown.join(
              ', '
            )}`,
          });
          return;
        }
      }

      const savedRule = await db.playlistAggregation.upsert({
        mode,
        ownerId: user.spotifyId,
        sourcePlaylistIds,
        targetSpotifyId,
      });
      const execution = await aggregateConfiguredPlaylistForUser(targetSpotifyId, user, { db });

      res.json({
        execution,
        rule: toAggregationRuleResponse(savedRule),
      });
    })
    .catch(next);
};

/**
 * Execute one configured aggregation rule immediately.
 */
export const runAggregation: RequestHandler = (req, res, next) => {
  const targetSpotifyId = asString(req.params.targetId);
  if (!targetSpotifyId) {
    res.status(400).json({ message: 'Missing target playlist id' });
    return;
  }
  const user = User.fromExpress(req.user as Express.User);
  aggregateConfiguredPlaylistForUser(targetSpotifyId, user)
    .then((result) => res.json(result))
    .catch((err) => {
      if (String(err).includes('not found')) {
        res.status(404).json({ message: 'Aggregation rule not found' });
      } else {
        next(err);
      }
    });
};

/**
 * Delete one configured aggregation rule.
 */
export const deleteAggregation: RequestHandler = (req, res, next) => {
  const targetSpotifyId = asString(req.params.targetId);
  if (!targetSpotifyId) {
    res.status(400).json({ message: 'Missing target playlist id' });
    return;
  }
  const user = User.fromExpress(req.user as Express.User);
  DB.getInstance()
    .playlistAggregation.delete(targetSpotifyId, user.spotifyId)
    .then((deleted) => {
      if (!deleted) {
        res.status(404).json({ message: 'Aggregation rule not found' });
        return;
      }
      res.json({ ok: true });
    })
    .catch(next);
};

/**
 * Trigger a server-side playlist discovery run.
 */
export const recognize: RequestHandler = (req, res, next) => {
  recognizePlaylistsOfUser(User.fromExpress(req.user as Express.User))
    .then((result) => res.json(result))
    .catch(next);
};

/**
 * Delete the current account after explicit confirmation.
 */
export const deleteAccount: RequestHandler = (req, res, next) => {
  const { sure } = req.body as { sure?: string };
  if (sure !== "Yes, I'm sure!") {
    res.status(400).json({ message: 'Incorrect confirmation phrase' });
    return;
  }
  const user = User.fromExpress(req.user as Express.User);
  DB.getInstance()
    .user.delete(user)
    .then(() =>
      req.logout((e) => {
        if (e) {
          next(e);
        } else {
          res.json({ ok: true });
        }
      })
    )
    .catch(next);
};
