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
const testUtils_1 = require("../testUtils");
describe('customMiddleware', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });
    describe('ensureNextcloudLogin', () => {
        it('returns 400 when token is missing', () => {
            jest.doMock('../types', () => ({ User: { isInWaitingFor: jest.fn() } }));
            jest.doMock('../config', () => ({ URI: false }));
            jest.isolateModules(() => {
                const { ensureNextcloudLogin } = require('../handlers/customMiddleware');
                const res = (0, testUtils_1.createRes)();
                const next = (0, testUtils_1.createNext)();
                const req = { query: {} };
                ensureNextcloudLogin(req, res, next);
                expect(res.status).toHaveBeenCalledWith(400);
                expect(res.send).toHaveBeenCalled();
                expect(next).not.toHaveBeenCalled();
            });
        });
        it('returns 401 when token is not waiting', () => {
            jest.doMock('../types', () => ({ User: { isInWaitingFor: jest.fn().mockReturnValue(false) } }));
            jest.doMock('../config', () => ({ URI: false }));
            jest.isolateModules(() => {
                const { ensureNextcloudLogin } = require('../handlers/customMiddleware');
                const res = (0, testUtils_1.createRes)();
                const next = (0, testUtils_1.createNext)();
                const req = { query: { token: 'abc' } };
                ensureNextcloudLogin(req, res, next);
                expect(res.status).toHaveBeenCalledWith(401);
                expect(res.send).toHaveBeenCalled();
                expect(next).not.toHaveBeenCalled();
            });
        });
        it('calls next when token is valid', () => {
            jest.doMock('../types', () => ({ User: { isInWaitingFor: jest.fn().mockReturnValue(true) } }));
            jest.doMock('../config', () => ({ URI: false }));
            jest.isolateModules(() => {
                const { ensureNextcloudLogin } = require('../handlers/customMiddleware');
                const res = (0, testUtils_1.createRes)();
                const next = (0, testUtils_1.createNext)();
                const req = { query: { token: 'abc' } };
                ensureNextcloudLogin(req, res, next);
                expect(next).toHaveBeenCalled();
                expect(res.status).not.toHaveBeenCalled();
            });
        });
    });
    describe('ensureAuthenticated', () => {
        it('redirects when not authenticated', () => {
            jest.doMock('../types', () => ({ User: { fromExpress: jest.fn() } }));
            jest.doMock('../config', () => ({ URI: false }));
            jest.isolateModules(() => {
                const { ensureAuthenticated } = require('../handlers/customMiddleware');
                const res = (0, testUtils_1.createRes)();
                const next = (0, testUtils_1.createNext)();
                const req = { isAuthenticated: () => false };
                ensureAuthenticated(req, res, next);
                expect(res.redirect).toHaveBeenCalledWith('/');
                expect(next).not.toHaveBeenCalled();
            });
        });
        it('refreshes credentials when expiring soon', () => __awaiter(void 0, void 0, void 0, function* () {
            jest.doMock('../types', () => ({ User: { fromExpress: jest.fn() } }));
            jest.doMock('../config', () => ({ URI: false }));
            yield new Promise((resolve) => {
                jest.isolateModules(() => {
                    const { ensureAuthenticated } = require('../handlers/customMiddleware');
                    const { User } = require('../types');
                    const res = (0, testUtils_1.createRes)();
                    const next = (0, testUtils_1.createNext)();
                    const updatedUser = { id: 'updated' };
                    const mockUser = {
                        credentials: { expiresAt: (0, moment_1.default)().add(10, 's') },
                        refreshCredentials: jest.fn().mockResolvedValue(updatedUser),
                    };
                    User.fromExpress.mockReturnValue(mockUser);
                    const req = { isAuthenticated: () => true, user: { id: 'orig' } };
                    ensureAuthenticated(req, res, next);
                    setImmediate(() => {
                        expect(mockUser.refreshCredentials).toHaveBeenCalled();
                        expect(req.user).toBe(updatedUser);
                        expect(next).toHaveBeenCalled();
                        resolve();
                    });
                });
            });
        }));
        it('skips refresh when credentials are valid', () => {
            jest.doMock('../types', () => ({ User: { fromExpress: jest.fn() } }));
            jest.doMock('../config', () => ({ URI: false }));
            jest.isolateModules(() => {
                const { ensureAuthenticated } = require('../handlers/customMiddleware');
                const { User } = require('../types');
                const res = (0, testUtils_1.createRes)();
                const next = (0, testUtils_1.createNext)();
                const mockUser = {
                    credentials: { expiresAt: (0, moment_1.default)().add(2, 'm') },
                    refreshCredentials: jest.fn(),
                };
                User.fromExpress.mockReturnValue(mockUser);
                const req = { isAuthenticated: () => true, user: { id: 'orig' } };
                ensureAuthenticated(req, res, next);
                expect(mockUser.refreshCredentials).not.toHaveBeenCalled();
                expect(next).toHaveBeenCalled();
            });
        });
    });
    describe('reroute', () => {
        it('redirects when URI host differs', () => {
            jest.doMock('../types', () => ({ User: {} }));
            jest.doMock('../config', () => ({ URI: 'https://example.com' }));
            jest.isolateModules(() => {
                const { reroute } = require('../handlers/customMiddleware');
                const res = (0, testUtils_1.createRes)();
                const next = (0, testUtils_1.createNext)();
                const req = {
                    protocol: 'http',
                    get: () => 'localhost:3000',
                    originalUrl: '/foo?x=1#y',
                };
                reroute(req, res, next);
                expect(res.redirect).toHaveBeenCalledWith('https://example.com/foo?x=1#y');
                expect(next).not.toHaveBeenCalled();
            });
        });
        it('calls next when URI host matches', () => {
            jest.doMock('../types', () => ({ User: {} }));
            jest.doMock('../config', () => ({ URI: 'https://localhost:3000' }));
            jest.isolateModules(() => {
                const { reroute } = require('../handlers/customMiddleware');
                const res = (0, testUtils_1.createRes)();
                const next = (0, testUtils_1.createNext)();
                const req = {
                    protocol: 'https',
                    get: () => 'localhost:3000',
                    originalUrl: '/foo',
                };
                reroute(req, res, next);
                expect(next).toHaveBeenCalled();
                expect(res.redirect).not.toHaveBeenCalled();
            });
        });
    });
});
