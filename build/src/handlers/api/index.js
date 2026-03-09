"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const customMiddleware_1 = require("../customMiddleware");
const service_1 = require("./service");
/**
 * JSON API routes consumed by the client.
 */
const apiRouter = (0, express_1.Router)();
apiRouter.get('/session', service_1.session);
apiRouter.get('/playlists', customMiddleware_1.ensureAuthenticated, service_1.playlists);
apiRouter.post('/playlists/recognize', customMiddleware_1.ensureAuthenticated, service_1.recognize);
apiRouter.get('/playlists/:id', customMiddleware_1.ensureAuthenticated, service_1.playlistDetail);
apiRouter.post('/playlists/:id', customMiddleware_1.ensureAuthenticated, service_1.updatePlaylist);
apiRouter.get('/aggregations', customMiddleware_1.ensureAuthenticated, service_1.aggregations);
apiRouter.post('/aggregations', customMiddleware_1.ensureAuthenticated, service_1.upsertAggregation);
apiRouter.post('/aggregations/:targetId/run', customMiddleware_1.ensureAuthenticated, service_1.runAggregation);
apiRouter.delete('/aggregations/:targetId', customMiddleware_1.ensureAuthenticated, service_1.deleteAggregation);
apiRouter.post('/auth/delete', customMiddleware_1.ensureAuthenticated, service_1.deleteAccount);
exports.default = apiRouter;
