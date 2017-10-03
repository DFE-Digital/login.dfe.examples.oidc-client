const express = require('express');

const app = express();

app.get('/', (req, res) => {
  res.send('login.dfe.examples.oidc-client is coming soon');
});

app.listen(44302);