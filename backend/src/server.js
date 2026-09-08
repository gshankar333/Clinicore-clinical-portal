require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', routes);

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Healthcare portal backend running on port ${PORT}`);
});

module.exports = app;
