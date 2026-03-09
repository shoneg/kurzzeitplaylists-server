"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNext = exports.createRes = void 0;
const createRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    res.redirect = jest.fn().mockReturnValue(res);
    res.render = jest.fn().mockReturnValue(res);
    return res;
};
exports.createRes = createRes;
const createNext = () => jest.fn();
exports.createNext = createNext;
