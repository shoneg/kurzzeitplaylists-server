"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEBUG = void 0;
const config_1 = require("../config");
const GLOBAL_DEBUG = config_1.GLOBAL_DEBUG;
/** Supported log levels (lower is more verbose). */
var DEBUG;
(function (DEBUG) {
    DEBUG[DEBUG["LOG"] = 0] = "LOG";
    DEBUG[DEBUG["INFO"] = 1] = "INFO";
    DEBUG[DEBUG["WARN"] = 2] = "WARN";
    DEBUG[DEBUG["ERROR"] = 3] = "ERROR";
})(DEBUG || (exports.DEBUG = DEBUG = {}));
/**
 * Minimal tagged logger honoring global debug overrides.
 */
class Logger {
    constructor(debug, tag) {
        // private messageMapper = (messages: any[]) => messages.map((m) => JSON.stringify(m, null, 2));
        this.messageMapper = (x) => x;
        this.debug = GLOBAL_DEBUG !== null && GLOBAL_DEBUG !== void 0 ? GLOBAL_DEBUG : debug;
        this.tag = `[${tag}]`;
    }
    /** Log at DEBUG.LOG (most verbose). */
    log(...messages) {
        if (this.debug == 0) {
            // const newMessages = this.messageMapper(messages);
            const newMessages = messages;
            console.log.apply(console, [this.tag, ...newMessages]);
        }
    }
    /** Log at DEBUG.INFO and above. */
    info(...messages) {
        if (this.debug <= 1) {
            // const newMessages = this.messageMapper(messages);
            const newMessages = messages;
            console.info.apply(console, [this.tag, ...newMessages]);
        }
    }
    /** Log at DEBUG.WARN and above. */
    warn(...messages) {
        if (this.debug <= 2) {
            // const newMessages = this.messageMapper(messages);
            const newMessages = messages;
            console.warn.apply(console, [this.tag, ...newMessages]);
        }
    }
    /** Always log errors. */
    error(...messages) {
        // const newMessages = this.messageMapper(messages);
        const newMessages = messages;
        console.error.apply(console, [this.tag, ...newMessages]);
    }
    /** Log regardless of configured debug level. */
    forceLog(...messages) {
        // const newMessages = this.messageMapper(messages);
        const newMessages = messages;
        console.log.apply(console, [this.tag, ...newMessages]);
    }
    /** Log a warning when the condition is falsy. */
    assert(condition, ...messages) {
        let _cond = true;
        if (typeof condition === 'boolean') {
            _cond = condition;
        }
        else {
            _cond = condition();
        }
        if (!_cond) {
            // const newMessages = this.messageMapper(messages);
            const newMessages = messages;
            console.log.apply(console, [this.tag, 'Assertion failed:', ...newMessages]);
        }
    }
}
exports.default = Logger;
