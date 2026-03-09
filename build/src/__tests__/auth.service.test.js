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
const testUtils_1 = require("../testUtils");
jest.mock('../types', () => ({ User: { fromExpress: jest.fn() } }));
describe('auth/service', () => {
    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();
    });
    it('authView redirects when already logged in', () => {
        jest.isolateModules(() => {
            const { authView } = require('../handlers/auth/service');
            const res = (0, testUtils_1.createRes)();
            const req = { user: { id: 'u1' } };
            authView(req, res);
            expect(res.redirect).toHaveBeenCalledWith('..');
        });
    });
    it('authView renders login page when not logged in', () => {
        jest.isolateModules(() => {
            const { authView } = require('../handlers/auth/service');
            const res = (0, testUtils_1.createRes)();
            const req = { user: undefined };
            authView(req, res);
            expect(res.render).toHaveBeenCalledWith('login.html');
        });
    });
    it('deleteView renders delete page', () => {
        jest.isolateModules(() => {
            const { deleteView } = require('../handlers/auth/service');
            const res = (0, testUtils_1.createRes)();
            deleteView({}, res);
            expect(res.render).toHaveBeenCalledWith('delete.html');
        });
    });
    it('deleteAccount rejects incorrect confirmation', () => {
        jest.doMock('../db', () => ({ __esModule: true, default: { getInstance: jest.fn() } }));
        jest.isolateModules(() => {
            const { deleteAccount } = require('../handlers/auth/service');
            const res = (0, testUtils_1.createRes)();
            const next = (0, testUtils_1.createNext)();
            const req = { body: { sure: 'nope' } };
            deleteAccount(req, res, next);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.send).toHaveBeenCalledWith('Incorrect confirmation phrase');
        });
    });
    it('deleteAccount deletes user and logs out on success', () => __awaiter(void 0, void 0, void 0, function* () {
        const deleteFn = jest.fn().mockResolvedValue(undefined);
        const getInstance = jest.fn().mockReturnValue({ user: { delete: deleteFn } });
        jest.doMock('../db', () => ({ __esModule: true, default: { getInstance } }));
        yield new Promise((resolve) => {
            jest.isolateModules(() => {
                const { deleteAccount } = require('../handlers/auth/service');
                const { User } = require('../types');
                const res = (0, testUtils_1.createRes)();
                const next = (0, testUtils_1.createNext)();
                const req = {
                    body: { sure: "Yes, I'm sure!" },
                    user: { id: 'u1' },
                    logout: (cb) => cb(),
                };
                User.fromExpress.mockReturnValue({ id: 'u1' });
                deleteAccount(req, res, next);
                setImmediate(() => {
                    expect(deleteFn).toHaveBeenCalled();
                    expect(res.redirect).toHaveBeenCalledWith('/');
                    resolve();
                });
            });
        });
    }));
});
