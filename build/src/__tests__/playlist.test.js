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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const moment_1 = __importDefault(require("moment"));
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
            oldestTrack: (0, moment_1.default)(),
            ownerId: 'o',
            spotifyId: '1',
        });
        const p2 = new Playlist({
            name: 'A',
            numberOfTracks: 1,
            oldestTrack: (0, moment_1.default)(),
            ownerId: 'o',
            spotifyId: '2',
        });
        const input = [p1, p2];
        const az = Playlist.sortLexicographic(input, 'az');
        const za = Playlist.sortLexicographic(input, 'za');
        expect(az.map((p) => p.name)).toEqual(['A', 'B']);
        expect(za.map((p) => p.name)).toEqual(['B', 'A']);
        expect(input.map((p) => p.name)).toEqual(['B', 'A']);
    });
    it('getMany paginates and concatenates results', () => __awaiter(void 0, void 0, void 0, function* () {
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
        };
        const items = yield Playlist.getMany(0, 2, spotify);
        expect(items.map((i) => i.id)).toEqual(['3', '1', '2']);
        expect(spotify.getUserPlaylists).toHaveBeenCalledTimes(2);
    }));
    it('getTracks paginates and concatenates results', () => __awaiter(void 0, void 0, void 0, function* () {
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
        };
        const items = yield Playlist.getTracks(spotify, '1', 0, 1);
        expect(items.map((i) => i.id)).toEqual(['t2', 't1']);
    }));
    it('refresh updates playlist via db', () => __awaiter(void 0, void 0, void 0, function* () {
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
            oldestTrack: (0, moment_1.default)('2020-01-01T00:00:00Z'),
            ownerId: 'o',
            spotifyId: 'sid',
        });
        yield p.refresh({}, false);
        expect(update).toHaveBeenCalledWith({
            spotifyId: 'sid',
            name: 'New Name',
            numberOfTracks: 10,
            oldestTrack: undefined,
        });
    }));
});
