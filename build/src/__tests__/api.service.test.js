"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const service_1 = require("../handlers/api/service");
const mockGetInstance = jest.fn();
jest.mock('../db', () => ({
    __esModule: true,
    default: { getInstance: (...args) => mockGetInstance(...args) },
}));
const createReq = (body = {}, params = {}) => ({
    body,
    params,
    user: {
        _credentials: {
            _accessToken: 'token',
            _expiresAt: new Date(),
            _refreshToken: 'refresh',
        },
        _displayName: 'User',
        _spotifyId: 'u1',
    },
});
const createRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};
describe('api/service aggregation handlers', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetInstance.mockReturnValue({
            playlistAggregation: { delete: jest.fn() },
            playlist: { insert: jest.fn() },
            user: { getPlaylists: jest.fn() },
        });
    });
    it('upsertAggregation rejects invalid mode', () => {
        const req = createReq({
            mode: 'wrong',
            sourcePlaylistIds: ['a'],
            targetSpotifyId: 'target',
        });
        const res = createRes();
        const next = jest.fn();
        (0, service_1.upsertAggregation)(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid aggregation mode' });
        expect(next).not.toHaveBeenCalled();
    });
    it('upsertAggregation rejects duplicate source playlists', () => {
        const req = createReq({
            mode: 'exact_union',
            sourcePlaylistIds: ['a', 'a'],
            targetSpotifyId: 'target',
        });
        const res = createRes();
        const next = jest.fn();
        (0, service_1.upsertAggregation)(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Duplicate source playlists are not allowed' });
        expect(next).not.toHaveBeenCalled();
    });
    it('runAggregation returns 400 when target id is missing', () => {
        const req = createReq({}, {});
        const res = createRes();
        const next = jest.fn();
        (0, service_1.runAggregation)(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Missing target playlist id' });
        expect(next).not.toHaveBeenCalled();
    });
    it('deleteAggregation returns 400 when target id is missing', () => {
        const req = createReq({}, {});
        const res = createRes();
        const next = jest.fn();
        (0, service_1.deleteAggregation)(req, res, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({ message: 'Missing target playlist id' });
        expect(next).not.toHaveBeenCalled();
    });
});
