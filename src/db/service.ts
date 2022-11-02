import { RowDataPacket } from 'mysql2/promise';
import SpotifyWebApi from 'spotify-web-api-node';
import { DB } from '.';
import Logger, { DEBUG } from '../utils/logger';

const logger = new Logger(DEBUG.WARN, '/db/service');

export const getPlaylists = (
  offset: number,
  limit: number,
  spotify: SpotifyWebApi
): Promise<SpotifyApi.PlaylistObjectSimplified[]> => {
  return new Promise<SpotifyApi.PlaylistObjectSimplified[]>((res, rej) => {
    spotify.getUserPlaylists({ offset, limit }).then((result) => {
      if (result.statusCode !== 200) {
        const body = result.body as { error?: { status?: number; message?: string } | undefined };
        rej(`Got statusCode=${result.statusCode} from spotify with message='${body?.error?.message}'`);
      }
      const nextURL = result.body.next;
      if (nextURL) {
        const nextURLMatcher = nextURL.match(/playlists\?offset=(\d+)\&limit=(\d+)$/);
        if (nextURLMatcher) {
          const nextOffset = parseInt(nextURLMatcher[1]);
          const nextLimit = parseInt(nextURLMatcher[2]);
          getPlaylists(nextOffset, nextLimit, spotify)
            .then((nextResult) => res(nextResult.concat(result.body.items)))
            .catch(rej);
        } else {
          rej(
            `While parsing nextURL, we unexpectedly got a falsy result. With nextURL='${nextURL}', we got as '${nextURLMatcher}' as result`
          );
        }
      } else {
        res(result.body.items);
      }
    });
  });
};

export function filterUnknownPlaylists<T extends { id: string }>(playlists: T[]): Promise<T[]> {
  let query = `
    SELECT * FROM playlist WHERE spotifyId IN (
  `;
  for (let i = 0; i < playlists.length; i++) {
    query += '?, ';
  }
  query = query.substring(0, query.length - 2) + ')';

  const idList = playlists.map((p) => p.id);

  return new Promise<T[]>((res, rej) => {
    DB.getInstance()
      .query<RowDataPacket[]>(query, idList)
      .then((results) => {
        const foundIDs = results[0].map((f) => f.spotifyId);
        const ret = playlists.filter((p) => !foundIDs.includes(p.id));
        res(ret);
      })
      .catch((err) => {
        logger.error('Got an unexpected error while looking for known playlists:', err);
        rej('Unexpectedly we got an Error while filtering the playlists');
      });
  });
}
