import { HOST, PORT } from './src/config';
import { initPassport } from './src/passport';
import consolidate from 'consolidate';
import express from 'express';
import rootRouter from './src/handlers';

// Initialize the express engine
export const app: express.Application = express();

// configure Express
app.set('views', __dirname + '/src/views');
app.set('view engine', 'html');

initPassport();

app.engine('html', consolidate.nunjucks);

app.use('', rootRouter);

// Server setup
app.listen(PORT, 'localhost', 100, () => {
    console.log(`Kurzzeitplaylistserver is running on http://${HOST}:${PORT}/`);
});