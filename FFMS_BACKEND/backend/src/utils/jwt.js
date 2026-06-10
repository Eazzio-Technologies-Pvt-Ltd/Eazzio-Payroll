const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { 
  accessTokenSecret, 
  refreshTokenSecret, 
  accessTokenExpiresIn, 
  refreshTokenExpiresIn 
} = require('../config/jwt');

/**
 * Sign an access token
 */
const signAccessToken = (userId, role, organizationId) => {
  return jwt.sign(
    { userId, role, organizationId },
    accessTokenSecret,
    { expiresIn: accessTokenExpiresIn }
  );
};

/**
 * Sign a refresh token
 */
const signRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    refreshTokenSecret,
    { expiresIn: refreshTokenExpiresIn }
  );
};

/**
 * Generate a hash of a refresh token to store in the database
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  hashToken
};
