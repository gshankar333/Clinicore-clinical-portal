require('dotenv').config();

const iast = require('./iast');
if (process.env.IAST_MODE === 'on') {
  iast.install();
}

const rasp = require('./rasp');
if (process.env.RASP_MODE === 'on') {
  rasp.install();
}

const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

if (process.env.IAST_MODE === 'on') {
  app.use(iast.middleware());
}

if (process.env.RASP_MODE === 'on') {
  app.use(rasp.taintMiddleware());
}

app.use('/api', routes);

if (process.env.RASP_MODE === 'on') {
  app.use(rasp.errorHandler());
}

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Healthcare portal backend running on port ${PORT}`);
});

module.exports = app;
