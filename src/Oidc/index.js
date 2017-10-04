const config = require('./../Config');
const {Strategy, Issuer} = require('openid-client');

module.exports.getPassportStrategy = async (logger) => {
  const issuer = await Issuer.discover(config.identifyingParty.url);

  const client = new issuer.Client({
    client_id: config.identifyingParty.clientId,
    client_secret: config.identifyingParty.clientSecret
  });
  if (config.identifyingParty.clockTolerance && config.identifyingParty.clockTolerance > 0) {
    client.CLOCK_TOLERANCE = config.identifyingParty.clockTolerance;
  }

  return new Strategy({
    client,
    params: {redirect_uri: `${config.hostingEnvironment.protocol}://${config.hostingEnvironment.host}:${config.hostingEnvironment.port}/auth/cb`, scope: 'openid profile email'}
  }, (tokenset, authUserInfo, done) => {

    client.userinfo(tokenset.access_token)
      .then((userInfo) => {
        userInfo.id = userInfo.sub;
        userInfo.name = userInfo.sub;

        done(null, userInfo);
      })
      .catch((err) => {
        logger.error(err);
        done(err);
      });

  });
};