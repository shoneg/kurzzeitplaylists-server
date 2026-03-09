import { aggregatePlaylistRule, buildDesiredUrisFromSourceTracks } from '../aggregation';
import { AggregationRule, Playlist, User } from '../types';

const toTrack = (uri: string | undefined, addedAt: string): SpotifyApi.PlaylistTrackObject =>
  ({
    added_at: addedAt,
    track: uri ? { uri } : {},
  } as unknown as SpotifyApi.PlaylistTrackObject);

describe('aggregation', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('buildDesiredUrisFromSourceTracks keeps source order, oldest-first, and de-duplicates by URI', () => {
    const result = buildDesiredUrisFromSourceTracks([
      [toTrack('spotify:track:b', '2024-01-02T00:00:00Z'), toTrack('spotify:track:a', '2024-01-01T00:00:00Z')],
      [toTrack('spotify:track:a', '2024-01-03T00:00:00Z'), toTrack('spotify:track:c', '2024-01-01T00:00:00Z')],
    ]);

    expect(result.uris).toEqual(['spotify:track:a', 'spotify:track:b', 'spotify:track:c']);
    expect(result.skippedNoUri).toBe(0);
  });

  it('buildDesiredUrisFromSourceTracks skips tracks without URI', () => {
    const result = buildDesiredUrisFromSourceTracks([[toTrack(undefined, '2024-01-01T00:00:00Z'), toTrack('spotify:track:a', '2024-01-02T00:00:00Z')]]);

    expect(result.uris).toEqual(['spotify:track:a']);
    expect(result.skippedNoUri).toBe(1);
  });

  it('aggregatePlaylistRule in exact_union removes extras and duplicates and appends missing in desired order', async () => {
    const spotify = {
      addTracksToPlaylist: jest.fn().mockResolvedValue({ statusCode: 201 }),
      removeTracksFromPlaylist: jest.fn().mockResolvedValue({ statusCode: 200 }),
    } as any;
    jest
      .spyOn(Playlist, 'getTracks')
      .mockResolvedValueOnce([
        toTrack('spotify:track:b', '2024-01-03T00:00:00Z'),
        toTrack('spotify:track:a', '2024-01-01T00:00:00Z'),
        toTrack('spotify:track:a', '2024-01-02T00:00:00Z'),
      ])
      .mockResolvedValueOnce([toTrack('spotify:track:c', '2024-01-01T00:00:00Z')])
      .mockResolvedValueOnce([
        toTrack('spotify:track:a', '2024-01-01T00:00:00Z'),
        toTrack('spotify:track:x', '2024-01-01T00:00:00Z'),
        toTrack('spotify:track:a', '2024-01-02T00:00:00Z'),
      ]);

    const refresh = jest.fn().mockResolvedValue(undefined);
    const db = {
      playlist: {
        get: jest.fn().mockResolvedValue({ refresh }),
      },
    } as any;
    const rule: AggregationRule = {
      mode: 'exact_union',
      ownerId: 'u1',
      sourcePlaylistIds: ['s1', 's2'],
      targetSpotifyId: 'target',
    };

    const result = await aggregatePlaylistRule(rule, {} as User, { db, spotify });

    expect(spotify.removeTracksFromPlaylist).toHaveBeenCalledWith('target', [{ uri: 'spotify:track:x' }, { uri: 'spotify:track:a' }]);
    expect(spotify.addTracksToPlaylist).toHaveBeenCalledWith('target', ['spotify:track:b', 'spotify:track:c']);
    expect(result.added).toBe(2);
    expect(result.removed).toBe(2);
    expect(refresh).toHaveBeenCalled();
  });

  it('aggregatePlaylistRule in add_missing only appends missing tracks', async () => {
    const spotify = {
      addTracksToPlaylist: jest.fn().mockResolvedValue({ statusCode: 201 }),
      removeTracksFromPlaylist: jest.fn(),
    } as any;
    jest
      .spyOn(Playlist, 'getTracks')
      .mockResolvedValueOnce([toTrack('spotify:track:a', '2024-01-01T00:00:00Z'), toTrack('spotify:track:b', '2024-01-02T00:00:00Z')])
      .mockResolvedValueOnce([toTrack('spotify:track:c', '2024-01-01T00:00:00Z')])
      .mockResolvedValueOnce([toTrack('spotify:track:a', '2024-01-01T00:00:00Z'), toTrack('spotify:track:x', '2024-01-01T00:00:00Z')]);

    const db = {
      playlist: {
        get: jest.fn().mockResolvedValue({ refresh: jest.fn().mockResolvedValue(undefined) }),
      },
    } as any;
    const rule: AggregationRule = {
      mode: 'add_missing',
      ownerId: 'u1',
      sourcePlaylistIds: ['s1', 's2'],
      targetSpotifyId: 'target',
    };

    const result = await aggregatePlaylistRule(rule, {} as User, { db, spotify });

    expect(spotify.removeTracksFromPlaylist).not.toHaveBeenCalled();
    expect(spotify.addTracksToPlaylist).toHaveBeenCalledWith('target', ['spotify:track:b', 'spotify:track:c']);
    expect(result.removed).toBe(0);
    expect(result.added).toBe(2);
  });
});
