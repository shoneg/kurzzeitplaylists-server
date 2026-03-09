"use strict";
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
const aggregation_1 = require("../aggregation");
const types_1 = require("../types");
const toTrack = (uri, addedAt) => ({
    added_at: addedAt,
    track: uri ? { uri } : {},
});
describe('aggregation', () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('buildDesiredUrisFromSourceTracks keeps source order, oldest-first, and de-duplicates by URI', () => {
        const result = (0, aggregation_1.buildDesiredUrisFromSourceTracks)([
            [toTrack('spotify:track:b', '2024-01-02T00:00:00Z'), toTrack('spotify:track:a', '2024-01-01T00:00:00Z')],
            [toTrack('spotify:track:a', '2024-01-03T00:00:00Z'), toTrack('spotify:track:c', '2024-01-01T00:00:00Z')],
        ]);
        expect(result.uris).toEqual(['spotify:track:a', 'spotify:track:b', 'spotify:track:c']);
        expect(result.skippedNoUri).toBe(0);
    });
    it('buildDesiredUrisFromSourceTracks skips tracks without URI', () => {
        const result = (0, aggregation_1.buildDesiredUrisFromSourceTracks)([[toTrack(undefined, '2024-01-01T00:00:00Z'), toTrack('spotify:track:a', '2024-01-02T00:00:00Z')]]);
        expect(result.uris).toEqual(['spotify:track:a']);
        expect(result.skippedNoUri).toBe(1);
    });
    it('aggregatePlaylistRule in exact_union removes extras and duplicates and appends missing in desired order', () => __awaiter(void 0, void 0, void 0, function* () {
        const spotify = {
            addTracksToPlaylist: jest.fn().mockResolvedValue({ statusCode: 201 }),
            removeTracksFromPlaylist: jest.fn().mockResolvedValue({ statusCode: 200 }),
        };
        jest
            .spyOn(types_1.Playlist, 'getTracks')
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
        };
        const rule = {
            mode: 'exact_union',
            ownerId: 'u1',
            sourcePlaylistIds: ['s1', 's2'],
            targetSpotifyId: 'target',
        };
        const result = yield (0, aggregation_1.aggregatePlaylistRule)(rule, {}, { db, spotify });
        expect(spotify.removeTracksFromPlaylist).toHaveBeenCalledWith('target', [{ uri: 'spotify:track:x' }, { uri: 'spotify:track:a' }]);
        expect(spotify.addTracksToPlaylist).toHaveBeenCalledWith('target', ['spotify:track:b', 'spotify:track:c']);
        expect(result.added).toBe(2);
        expect(result.removed).toBe(2);
        expect(refresh).toHaveBeenCalled();
    }));
    it('aggregatePlaylistRule in add_missing only appends missing tracks', () => __awaiter(void 0, void 0, void 0, function* () {
        const spotify = {
            addTracksToPlaylist: jest.fn().mockResolvedValue({ statusCode: 201 }),
            removeTracksFromPlaylist: jest.fn(),
        };
        jest
            .spyOn(types_1.Playlist, 'getTracks')
            .mockResolvedValueOnce([toTrack('spotify:track:a', '2024-01-01T00:00:00Z'), toTrack('spotify:track:b', '2024-01-02T00:00:00Z')])
            .mockResolvedValueOnce([toTrack('spotify:track:c', '2024-01-01T00:00:00Z')])
            .mockResolvedValueOnce([toTrack('spotify:track:a', '2024-01-01T00:00:00Z'), toTrack('spotify:track:x', '2024-01-01T00:00:00Z')]);
        const db = {
            playlist: {
                get: jest.fn().mockResolvedValue({ refresh: jest.fn().mockResolvedValue(undefined) }),
            },
        };
        const rule = {
            mode: 'add_missing',
            ownerId: 'u1',
            sourcePlaylistIds: ['s1', 's2'],
            targetSpotifyId: 'target',
        };
        const result = yield (0, aggregation_1.aggregatePlaylistRule)(rule, {}, { db, spotify });
        expect(spotify.removeTracksFromPlaylist).not.toHaveBeenCalled();
        expect(spotify.addTracksToPlaylist).toHaveBeenCalledWith('target', ['spotify:track:b', 'spotify:track:c']);
        expect(result.removed).toBe(0);
        expect(result.added).toBe(2);
    }));
});
