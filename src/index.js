const path = require('path');
const fs = require('fs');
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const morgan = require('morgan');
const winston = require('winston');
const config = require('./Config');
const {getPassportStrategy} = require('./Oidc');

const logger = new (winston.Logger)({
  colors: config.loggerSettings.colors,
  transports: [
    new (winston.transports.Console)({level: 'info', colorize: true}),
  ],
});

init = async () => {

  passport.use('oidc', await getPassportStrategy(logger));
  passport.serializeUser(function (user, done) {
    done(null, user);
  });
  passport.deserializeUser(function (user, done) {
    done(null, user);
  });

  const app = express();
  app.use(morgan('combined', {stream: fs.createWriteStream('./access.log', {flags: 'a'})}));
  app.use(morgan('dev'));
  app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: config.hostingEnvironment.sessionSecret
  }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.set('view engine', 'ejs');
  app.set('views', path.resolve(__dirname, 'views'));

  // Setup routes
  app.get('/', (req, res) => {
    res.render('index', {
      isLoggedIn: req.isAuthenticated(),
      user: req.user ? req.user : {id: '', name: ''}
    });
  });

  app.get('/auth', passport.authenticate('oidc'));
  app.get('/auth/cb', passport.authenticate('oidc', { successRedirect: '/', failureRedirect: '/auth' }));

  // Setup server
  if (config.hostingEnvironment.env == 'dev') {
    app.proxy = true;

    const https = require('https');
    const options = {
      key: config.hostingEnvironment.sslKey,
      cert: config.hostingEnvironment.sslCert,
      requestCert: false,
      rejectUnauthorized: false
    };
    const server = https.createServer(options, app);

    server.listen(config.hostingEnvironment.port, function () {
      logger.info(`Dev server listening on https://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}`);
    })
  } else {
    app.listen(process.env.PORT, function() {
      logger.info(`Dev server listening on http://${config.hostingEnvironment.host}:${process.env.PORT}`);
    });
  }
};

init().catch((err => {
  logger.error(err);
}));