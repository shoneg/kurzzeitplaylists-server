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
const spotifyCredentials_1 = __importDefault(require("../types/spotifyCredentials"));
describe('SpotifyCredentials', () => {
    it('refresh updates access token and expiresAt and calls db update', () => __awaiter(void 0, void 0, void 0, function* () {
        const creds = new spotifyCredentials_1.default('old', (0, moment_1.default)('2020-01-01T00:00:00Z'), 'rt', 'sid');
        const db = { credentials: { update: jest.fn().mockResolvedValue(undefined) } };
        const spotify = {
            refreshAccessToken: jest.fn().mockResolvedValue({
                body: { access_token: 'new', refresh_token: 'newrt', expires_in: 60 },
            }),
        };
        const now = (0, moment_1.default)('2020-01-01T00:00:00Z');
        yield creds.refresh({ db, spotify, now });
        expect(creds.accessToken).toBe('new');
        expect(creds.refreshToken).toBe('newrt');
        expect(creds.expiresAt.toISOString()).toBe(now.clone().add(60, 's').toISOString());
        expect(db.credentials.update).toHaveBeenCalledWith(creds, 'sid');
    }));
    it('refresh preserves refreshToken when missing', () => __awaiter(void 0, void 0, void 0, function* () {
        const creds = new spotifyCredentials_1.default('old', (0, moment_1.default)('2020-01-01T00:00:00Z'), 'rt', 'sid');
        const db = { credentials: { update: jest.fn().mockResolvedValue(undefined) } };
        const spotify = {
            refreshAccessToken: jest.fn().mockResolvedValue({
                body: { access_token: 'new', expires_in: 60 },
            }),
        };
        yield creds.refresh({ db, spotify, now: (0, moment_1.default)('2020-01-01T00:00:00Z') });
        expect(creds.refreshToken).toBe('rt');
    }));
});
