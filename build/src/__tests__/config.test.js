"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../config");
test('all env variables should be initialized', () => {
    expect(config_1.CLIENT_ID).toBeDefined();
    expect(config_1.CLIENT_SECRET).toBeDefined();
    expect(config_1.DB_HOST).toBeDefined();
    expect(config_1.DB_NAME).toBeDefined();
    expect(config_1.DB_PASSWORD).toBeDefined();
    expect(config_1.DB_PORT).toBeDefined();
    expect(config_1.DB_USER).toBeDefined();
    expect(config_1.HOST).toBeDefined();
    expect(config_1.PORT).toBeDefined();
    expect(config_1.RUNNING_WITH_TLS).toBeDefined();
    expect(config_1.SESSION_SECRET).toBeDefined();
    expect(config_1.SESSION_TIMEOUT).toBeDefined();
    expect(config_1.URI).toBeDefined();
});
