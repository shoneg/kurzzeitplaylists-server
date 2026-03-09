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
const cron_1 = require("../cron");
describe('cron', () => {
    it('aggregateThenCleanup runs cleanup after aggregation', () => __awaiter(void 0, void 0, void 0, function* () {
        const calls = [];
        const aggregateAllConfiguredPlaylists = jest.fn().mockImplementation(() => __awaiter(void 0, void 0, void 0, function* () {
            calls.push('aggregate');
        }));
        const trackDeletion = jest.fn().mockImplementation(() => {
            calls.push('cleanup');
        });
        (0, cron_1.aggregateThenCleanup)({ aggregateAllConfiguredPlaylists, trackDeletion });
        yield Promise.resolve();
        yield Promise.resolve();
        expect(aggregateAllConfiguredPlaylists).toHaveBeenCalled();
        expect(trackDeletion).toHaveBeenCalled();
        expect(calls).toEqual(['aggregate', 'cleanup']);
    }));
});
