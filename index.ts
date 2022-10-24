import { defaultErrorHandler } from './src/handlers/errorHandlers';
import { HOST, PORT } from './src/config';
import { initPassport } from './src/passport';
import consolidate from 'consolidate';
import express from 'express';
import Logger, { DEBUG } from './src/utils/logger';
import moment from 'moment';
import rootRouter from './src/handlers';
import { refreshAllSessions } from './src/db';

const logger = new Logger(DEBUG.INFO, 'index');

// Initialize the express engine
export const app: express.Application = express();

// configure Express
app.set('views', __dirname + '/src/views');
app.set('view engine', 'html');

initPassport();

app.engine('html', consolidate.nunjucks);

app.use('', rootRouter);

app.use(defaultErrorHandler);

// Server setup
app.listen(PORT, 'localhost', 100, () => {
  logger.info(`Kurzzeitplaylistserver is running on http://${HOST}:${PORT}/`);
});

// refresh tokens of all users
setInterval(refreshAllSessions, moment.duration(60, 's').asMilliseconds());
