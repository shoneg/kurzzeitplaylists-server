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
const user_1 = __importDefault(require("../types/user"));
const spotifyCredentials_1 = __importDefault(require("../types/spotifyCredentials"));
describe('User', () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2020-01-01T00:00:00Z'));
        user_1.default.waitingFor = [];
        user_1.default.stopWaitingForCleanup();
    });
    afterEach(() => {
        user_1.default.stopWaitingForCleanup();
        jest.useRealTimers();
    });
    it('isInWaitingFor returns true for first element and removes it', () => {
        const t1 = user_1.default.addWaitFor('t1');
        const t2 = user_1.default.addWaitFor('t2');
        expect(t1).toBe('t1');
        expect(t2).toBe('t2');
        expect(user_1.default.isInWaitingFor('t1')).toBe(true);
        expect(user_1.default.isInWaitingFor('t1')).toBe(false);
        expect(user_1.default.isInWaitingFor('t2')).toBe(true);
    });
    it('startWaitingForCleanup removes expired tokens', () => {
        const now = (0, moment_1.default)();
        user_1.default.waitingFor = [
            { token: 'old', timestamp: now.clone().subtract(31, 's').toDate() },
            { token: 'fresh', timestamp: now.clone().add(40, 's').toDate() },
        ];
        user_1.default.startWaitingForCleanup();
        jest.advanceTimersByTime(moment_1.default.duration(60, 's').asMilliseconds());
        expect(user_1.default.isInWaitingFor('old')).toBe(false);
        expect(user_1.default.isInWaitingFor('fresh')).toBe(true);
    });
    it('refreshCredentials uses provided db', () => __awaiter(void 0, void 0, void 0, function* () {
        const credentials = new spotifyCredentials_1.default('at', (0, moment_1.default)(), 'rt', 'sid');
        const user = new user_1.default(credentials, 'name', 'sid');
        const db = {
            user: { get: jest.fn().mockResolvedValue(user) },
            credentials: { update: jest.fn().mockResolvedValue(undefined) },
        };
        jest.spyOn(credentials, 'refresh').mockResolvedValue(undefined);
        yield user.refreshCredentials({ db });
        expect(credentials.refresh).toHaveBeenCalledWith({ db });
        expect(db.user.get).toHaveBeenCalledWith('sid');
    }));
});
