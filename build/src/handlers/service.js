"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.falsePathErrorView = void 0;
/**
 * Render the 404 page for unknown routes.
 */
const falsePathErrorView = (req, res) => {
    res.status(404).render('notFound', { path: req.originalUrl });
};
exports.falsePathErrorView = falsePathErrorView;
