import moment from 'moment';
jest.mock('../spotifyApi', () => ({
  getSpotify: jest.fn(),
}));

jest.mock('../db', () => ({
  __esModule: true,
  default: { getInstance: jest.fn() },
}));

describe('Playlist', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sortLexicographic returns sorted copies', () => {
    const Playlist = require('../types/playlist').default;
    const p1 = new Playlist({
      name: 'B',
      numberOfTracks: 1,
      oldestTrack: moment(),
      ownerId: 'o',
      spotifyId: '1',
    });
    const p2 = new Playlist({
      name: 'A',
      numberOfTracks: 1,
      oldestTrack: moment(),
      ownerId: 'o',
      spotifyId: '2',
    });
    const input = [p1, p2];

    const az = Playlist.sortLexicographic(input, 'az');
    const za = Playlist.sortLexicographic(input, 'za');

    expect(az.map((p: any) => p.name)).toEqual(['A', 'B']);
    expect(za.map((p: any) => p.name)).toEqual(['B', 'A']);
    expect(input.map((p: any) => p.name)).toEqual(['B', 'A']);
  });

  it('getMany paginates and concatenates results', async () => {
    const Playlist = require('../types/playlist').default;
    const spotify = {
      getUserPlaylists: jest
        .fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            items: [{ id: '1' }, { id: '2' }],
            next: 'https://api.spotify.com/v1/me/playlists?offset=2&limit=2',
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { items: [{ id: '3' }], next: null },
        }),
    } as any;

    const items = await Playlist.getMany(0, 2, spotify);

    expect(items.map((i: any) => i.id)).toEqual(['3', '1', '2']);
    expect(spotify.getUserPlaylists).toHaveBeenCalledTimes(2);
  });

  it('getTracks paginates and concatenates results', async () => {
    const Playlist = require('../types/playlist').default;
    const spotify = {
      getPlaylistTracks: jest
        .fn()
        .mockResolvedValueOnce({
          statusCode: 200,
          body: {
            items: [{ id: 't1' }],
            next: 'https://api.spotify.com/v1/playlists/1/tracks?offset=1&limit=1',
          },
        })
        .mockResolvedValueOnce({
          statusCode: 200,
          body: { items: [{ id: 't2' }], next: null },
        }),
    } as any;

    const items = await Playlist.getTracks(spotify, '1', 0, 1);

    expect(items.map((i: any) => i.id)).toEqual(['t2', 't1']);
  });

  it('refresh updates playlist via db', async () => {
    const { getSpotify } = require('../spotifyApi');
    const DB = require('../db').default;
    const Playlist = require('../types/playlist').default;
    const update = jest.fn().mockResolvedValue(undefined);

    DB.getInstance.mockReturnValue({ playlist: { update } });
    getSpotify.mockReturnValue({
      getPlaylist: jest.fn().mockResolvedValue({
        body: {
          name: 'New Name',
          tracks: { total: 10, items: [], next: null },
        },
      }),
    });

    const p = new Playlist({
      name: 'Old Name',
      numberOfTracks: 1,
      oldestTrack: moment('2020-01-01T00:00:00Z'),
      ownerId: 'o',
      spotifyId: 'sid',
    });

    await p.refresh({} as any, false);

    expect(update).toHaveBeenCalledWith({
      spotifyId: 'sid',
      name: 'New Name',
      numberOfTracks: 10,
      oldestTrack: undefined,
    });
  });
});
