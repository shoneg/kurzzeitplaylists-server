"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const service_1 = require("./service");
/**
 * Server-rendered playlist views (legacy UI).
 */
const playlistRouter = (0, express_1.Router)();
playlistRouter.get('/', service_1.playlistsView);
playlistRouter.get('/recognize', service_1.recognize);
playlistRouter.get('/:id', service_1.editPlaylistView);
playlistRouter.post('/:id', service_1.submitEditPlaylist);
exports.default = playlistRouter;
