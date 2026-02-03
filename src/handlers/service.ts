import { RequestHandler } from 'express';

/**
 * Render the 404 page for unknown routes.
 */
export const falsePathErrorView: RequestHandler = (req, res) => {
  res.status(404).render('notFound', { path: req.originalUrl });
};
