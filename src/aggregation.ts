import moment from 'moment';
import * as https from 'https';
import SpotifyWebApi from 'spotify-web-api-node';
import DB from './db';
import { getSpotify, getSpotifyClientCredentials } from './spotifyApi';
import { AggregationMode, AggregationRule, Playlist, User } from './types';
import Logger, { DEBUG } from './utils/logger';

const logger = new Logger(DEBUG.WARN, '/aggregation');

export type AggregationExecutionResult = {
  added: number;
  desiredUnique: number;
  mode: AggregationMode;
  removed: number;
  skippedNoUri: number;
  sourcePlaylistIds: string[];
  targetSpotifyId: string;
};

type AggregateDeps = {
  db?: DB;
  spotify?: SpotifyWebApi;
};

const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
};

const runAddTracks = async (spotify: SpotifyWebApi, playlistId: string, uris: string[]): Promise<void> => {
  for (const uriChunk of chunk(uris, 100)) {
    const result = await spotify.addTracksToPlaylist(playlistId, uriChunk);
    if (!(result.statusCode === 201 || result.statusCode === 200)) {
      throw new Error(`Could not add tracks to playlist '${playlistId}' (status=${result.statusCode})`);
    }
  }
};

const runRemoveTracks = async (spotify: SpotifyWebApi, playlistId: string, uris: string[]): Promise<void> => {
  for (const uriChunk of chunk(uris, 100)) {
    const result = await spotify.removeTracksFromPlaylist(
      playlistId,
      uriChunk.map((uri) => ({ uri }))
    );
    if (result.statusCode !== 200) {
      throw new Error(`Could not remove tracks from playlist '${playlistId}' (status=${result.statusCode})`);
    }
  }
};

const sortByAddedAtOldestFirst = (tracks: SpotifyApi.PlaylistTrackObject[]): SpotifyApi.PlaylistTrackObject[] =>
  [...tracks].sort((a, b) => moment(a.added_at).valueOf() - moment(b.added_at).valueOf());

const playlistMarketFallbacks = [undefined, 'from_token', 'DE', 'US', 'SE', 'GB', 'AT', 'CH'] as const;

const requestText = (url: string, redirectCount = 0): Promise<string> =>
  new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          Accept: 'text/html,application/xhtml+xml',
          'User-Agent': 'Mozilla/5.0 (compatible; kurzzeitplaylists/1.0)',
        },
      },
      (response) => {
        const status = response.statusCode ?? 500;
        const locationHeader = response.headers.location;
        if (status >= 300 && status < 400 && typeof locationHeader === 'string') {
          response.resume();
          if (redirectCount >= 5) {
            reject(new Error(`Request to '${url}' exceeded redirect limit`));
            return;
          }
          const redirectUrl = new URL(locationHeader, url).toString();
          requestText(redirectUrl, redirectCount + 1).then(resolve).catch(reject);
          return;
        }
        if (status >= 400) {
          response.resume();
          reject(new Error(`Request to '${url}' failed with status=${status}`));
          return;
        }
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        response.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
      }
    );
    req.on('error', reject);
    req.setTimeout(7000, () => req.destroy(new Error(`Request to '${url}' timed out`)));
  });

const extractTrackUrisFromEmbedHtml = (html: string): string[] => {
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch?.[1]) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]) as {
        props?: {
          pageProps?: {
            state?: {
              data?: {
                entity?: {
                  audioItems?: Array<{ uri?: unknown }>;
                };
              };
            };
          };
        };
      };
      const audioItems = nextData.props?.pageProps?.state?.data?.entity?.audioItems;
      if (Array.isArray(audioItems)) {
        const fromJson = audioItems
          .map((item) => item?.uri)
          .filter((uri): uri is string => typeof uri === 'string' && uri.startsWith('spotify:track:'));
        if (fromJson.length > 0) {
          return fromJson;
        }
      }
    } catch (_err) {}
  }
  const matches = html.match(/spotify:track:[A-Za-z0-9]{22}/g) ?? [];
  const seen = new Set<string>();
  const uniqueInOrder: string[] = [];
  matches.forEach((uri) => {
    if (!seen.has(uri)) {
      seen.add(uri);
      uniqueInOrder.push(uri);
    }
  });
  return uniqueInOrder;
};

const loadSourceTrackUrisFromEmbed = async (sourceSpotifyId: string): Promise<string[] | undefined> => {
  const embedUrl = `https://open.spotify.com/embed/playlist/${encodeURIComponent(sourceSpotifyId)}`;
  try {
    const html = await requestText(embedUrl);
    const uris = extractTrackUrisFromEmbedHtml(html);
    if (uris.length > 0) {
      return uris;
    }
  } catch (_err) {}
  return undefined;
};

const toSyntheticPlaylistTrackObjects = (uris: string[]): SpotifyApi.PlaylistTrackObject[] =>
  uris.map(
    (uri, index) =>
      ({
        added_at: moment.utc(0).add(index, 'seconds').toISOString(),
        track: { uri } as SpotifyApi.TrackObjectFull,
      }) as SpotifyApi.PlaylistTrackObject
  );

export const buildDesiredUrisFromSourceTracks = (
  sourceTracks: SpotifyApi.PlaylistTrackObject[][]
): { skippedNoUri: number; uris: string[] } => {
  const seen = new Set<string>();
  const uris: string[] = [];
  let skippedNoUri = 0;
  sourceTracks.forEach((tracks) => {
    sortByAddedAtOldestFirst(tracks).forEach((track) => {
      const uri = track.track?.uri;
      if (!uri) {
        skippedNoUri += 1;
        return;
      }
      if (!seen.has(uri)) {
        seen.add(uri);
        uris.push(uri);
      }
    });
  });
  return { skippedNoUri, uris };
};

const loadSourceTracksWithMarketFallback = async (
  spotify: SpotifyWebApi,
  sourceSpotifyId: string
): Promise<SpotifyApi.PlaylistTrackObject[] | undefined> => {
  for (const market of playlistMarketFallbacks) {
    try {
      return await Playlist.getTracks(spotify, sourceSpotifyId, 0, 50, 'added_at,track.uri', market);
    } catch (_err) {}
  }
  return undefined;
};

const loadDesiredUris = async (
  spotify: SpotifyWebApi,
  sourcePlaylistIds: string[]
): Promise<{ skippedNoUri: number; uris: string[] }> => {
  const sourceTracks: SpotifyApi.PlaylistTrackObject[][] = [];
  let publicSpotify: SpotifyWebApi | undefined;
  let appTokenUnavailable = false;
  for (const sourceSpotifyId of sourcePlaylistIds) {
    const tracksFromUserToken = await loadSourceTracksWithMarketFallback(spotify, sourceSpotifyId);
    if (tracksFromUserToken) {
      sourceTracks.push(tracksFromUserToken);
      continue;
    }
    if (!publicSpotify && !appTokenUnavailable) {
      try {
        publicSpotify = await getSpotifyClientCredentials();
      } catch (err) {
        appTokenUnavailable = true;
        logger.warn('Skipping app-token source fallback because client-credentials grant failed', err);
      }
    }
    if (publicSpotify) {
      const tracksFromAppToken = await loadSourceTracksWithMarketFallback(publicSpotify, sourceSpotifyId);
      if (tracksFromAppToken) {
        sourceTracks.push(tracksFromAppToken);
        continue;
      }
    }
    const tracksFromEmbed = await loadSourceTrackUrisFromEmbed(sourceSpotifyId);
    if (tracksFromEmbed) {
      sourceTracks.push(toSyntheticPlaylistTrackObjects(tracksFromEmbed));
      continue;
    }
    logger.warn(`Could not load source playlist '${sourceSpotifyId}' via user/app token nor embed`);
    throw new Error(`Could not load source playlist '${sourceSpotifyId}'`);
  }
  return buildDesiredUrisFromSourceTracks(sourceTracks);
};

export const aggregatePlaylistRule = async (
  rule: AggregationRule,
  user: User,
  deps?: AggregateDeps
): Promise<AggregationExecutionResult> => {
  const db = deps?.db ?? DB.getInstance();
  const spotify = deps?.spotify ?? getSpotify(user);

  const desired = await loadDesiredUris(spotify, rule.sourcePlaylistIds);
  const targetTracks = await Playlist.getTracks(spotify, rule.targetSpotifyId, 0, 50, 'track.uri');
  const currentUris = targetTracks.map((track) => track.track?.uri).filter((uri): uri is string => Boolean(uri));
  let skippedNoUri = desired.skippedNoUri + (targetTracks.length - currentUris.length);
  let removed = 0;
  let added = 0;

  if (rule.mode === 'add_missing') {
    const existing = new Set(currentUris);
    const missing = desired.uris.filter((uri) => !existing.has(uri));
    if (missing.length > 0) {
      await runAddTracks(spotify, rule.targetSpotifyId, missing);
      added = missing.length;
    }
  } else {
    const desiredSet = new Set(desired.uris);
    const keptDesired = new Set<string>();
    const toRemove: string[] = [];
    currentUris.forEach((uri) => {
      if (!desiredSet.has(uri)) {
        toRemove.push(uri);
      } else if (keptDesired.has(uri)) {
        toRemove.push(uri);
      } else {
        keptDesired.add(uri);
      }
    });
    if (toRemove.length > 0) {
      await runRemoveTracks(spotify, rule.targetSpotifyId, toRemove);
      removed = toRemove.length;
    }
    const missing = desired.uris.filter((uri) => !keptDesired.has(uri));
    if (missing.length > 0) {
      await runAddTracks(spotify, rule.targetSpotifyId, missing);
      added = missing.length;
    }
  }

  try {
    const playlist = await db.playlist.get(rule.targetSpotifyId);
    await playlist.refresh(user.credentials, true);
  } catch (err) {
    logger.warn(`Could not refresh playlist '${rule.targetSpotifyId}' after aggregation:`, err);
  }

  return {
    added,
    desiredUnique: desired.uris.length,
    mode: rule.mode,
    removed,
    skippedNoUri,
    sourcePlaylistIds: [...rule.sourcePlaylistIds],
    targetSpotifyId: rule.targetSpotifyId,
  };
};

export const aggregateConfiguredPlaylistForUser = async (
  targetSpotifyId: string,
  user: User,
  deps?: Omit<AggregateDeps, 'spotify'> & { spotify?: SpotifyWebApi }
): Promise<AggregationExecutionResult> => {
  const db = deps?.db ?? DB.getInstance();
  const rule = await db.playlistAggregation.getForTarget(targetSpotifyId, user.spotifyId);
  if (rule.sourcePlaylistIds.length < 1) {
    throw new Error(`Aggregation rule for target '${targetSpotifyId}' has no source playlists`);
  }
  return aggregatePlaylistRule(rule, user, deps);
};

export const aggregateAllConfiguredPlaylists = async (deps?: { db?: DB }): Promise<AggregationExecutionResult[]> => {
  const db = deps?.db ?? DB.getInstance();
  const rules = await db.playlistAggregation.getAll();
  const results: AggregationExecutionResult[] = [];
  for (const rule of rules) {
    if (rule.sourcePlaylistIds.length < 1) {
      logger.warn(`Skipping aggregation for target='${rule.targetSpotifyId}' because no source playlists are configured`);
      continue;
    }
    try {
      const user = await db.user.get(rule.ownerId);
      const result = await aggregatePlaylistRule(rule, user, { db });
      results.push(result);
    } catch (err) {
      logger.error(`Could not aggregate target='${rule.targetSpotifyId}'`, err);
    }
  }
  return results;
};
