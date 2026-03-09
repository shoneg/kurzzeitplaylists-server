"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testUtils_1 = require("../testUtils");
describe('handlers/service', () => {
    it('falsePathErrorView renders notFound with path', () => {
        const { falsePathErrorView } = require('../handlers/service');
        const res = (0, testUtils_1.createRes)();
        const next = (0, testUtils_1.createNext)();
        const req = { originalUrl: '/missing' };
        falsePathErrorView(req, res, next);
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.render).toHaveBeenCalledWith('notFound', { path: '/missing' });
    });
});
