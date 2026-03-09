"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testUtils_1 = require("../testUtils");
describe('errorHandlers', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
        jest.spyOn(console, 'error').mockImplementation(() => undefined);
        jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });
    it('defaultErrorHandler returns 500', () => {
        jest.isolateModules(() => {
            const { defaultErrorHandler } = require('../handlers/errorHandlers');
            const res = (0, testUtils_1.createRes)();
            const next = (0, testUtils_1.createNext)();
            defaultErrorHandler(new Error('boom'), {}, res, next);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith('Internal server error');
            expect(next).not.toHaveBeenCalled();
        });
    });
    it('authErrorHandler handles registration failures', () => {
        jest.isolateModules(() => {
            const { authErrorHandler } = require('../handlers/errorHandlers');
            const res = (0, testUtils_1.createRes)();
            const next = (0, testUtils_1.createNext)();
            authErrorHandler(new Error('registration failed'), {}, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith('Registration failed');
            expect(next).not.toHaveBeenCalled();
        });
    });
    it('authErrorHandler handles token errors', () => {
        jest.isolateModules(() => {
            const { authErrorHandler } = require('../handlers/errorHandlers');
            const res = (0, testUtils_1.createRes)();
            const next = (0, testUtils_1.createNext)();
            authErrorHandler(new Error('TokenError: expired'), {}, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });
    });
    it('authErrorHandler handles login failures', () => {
        jest.isolateModules(() => {
            const { authErrorHandler } = require('../handlers/errorHandlers');
            const res = (0, testUtils_1.createRes)();
            const next = (0, testUtils_1.createNext)();
            authErrorHandler(new Error('login failed'), {}, res, next);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith('Login failed');
            expect(next).not.toHaveBeenCalled();
        });
    });
    it('authErrorHandler passes through unknown errors', () => {
        jest.isolateModules(() => {
            const { authErrorHandler } = require('../handlers/errorHandlers');
            const res = (0, testUtils_1.createRes)();
            const next = (0, testUtils_1.createNext)();
            const err = new Error('something else');
            authErrorHandler(err, {}, res, next);
            expect(next).toHaveBeenCalledWith(err);
        });
    });
    it('spotifyErrorHandler handles 404 responses', () => {
        jest.isolateModules(() => {
            const { spotifyErrorHandler } = require('../handlers/errorHandlers');
            const res = (0, testUtils_1.createRes)();
            const next = (0, testUtils_1.createNext)();
            const err = {
                message: 'Random error',
                body: { error: { status: 404, message: 'Not found' } },
            };
            spotifyErrorHandler(err, {}, res, next);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.send).toHaveBeenCalled();
            expect(next).not.toHaveBeenCalled();
        });
    });
    it('spotifyErrorHandler passes through Spotify web api errors', () => {
        jest.isolateModules(() => {
            const { spotifyErrorHandler } = require('../handlers/errorHandlers');
            const res = (0, testUtils_1.createRes)();
            const next = (0, testUtils_1.createNext)();
            const err = { message: "Spotify's Web API error" };
            spotifyErrorHandler(err, {}, res, next);
            expect(next).toHaveBeenCalledWith(err);
        });
    });
    it('spotifyErrorHandler handles unknown format', () => {
        jest.isolateModules(() => {
            const { spotifyErrorHandler } = require('../handlers/errorHandlers');
            const res = (0, testUtils_1.createRes)();
            const next = (0, testUtils_1.createNext)();
            const err = { message: 'boom' };
            spotifyErrorHandler(err, {}, res, next);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith('There was an unknown error.');
            expect(next).not.toHaveBeenCalled();
        });
    });
});
