const express = require('express');
const basicAuth = require('express-basic-auth');

const users = require('../users.json');

const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const crypto = require('crypto');
let {publicKey, privateKey} = crypto.generateKeyPairSync('rsa', {
  modulusLength: 4096,
  publicKeyEncoding: {type: 'spki', format: 'pem'},
  privateKeyEncoding: {type: 'pkcs8', format: 'pem'},
});

const tokenOptions = {
  algorithm: 'RS512',
  expiresIn: '6h',
};

const getUnauthorizedResponse = (req) => {
  return req.auth ? 'Credentials rejected' : 'No credentials provided'
};

// jwt auth function
const authenticateToken = (token, callback) => {
  jwt.verify(token, publicKey, tokenOptions, callback);
};

const authenticate = (req, res, next) => {
  const token = req.cookies['x-auth-token'];

  if (token) {
    authenticateToken(token, (err, user) => {
      if (err) {
        // token invalid
        req.user = null;
      } else {
        // token valid
        req.user = user;
      }
      // donot move next() call outside, must remain inside callback
      next();
    });
  } else {
    // no token
    req.user = null;
    next();
  }
};

// pre-hash passwords and prepare basic-auth user table for privilegged users
let basicAuthUsers = {};
for (const user in users) {
  // hash passwd
  users[user].hashedPassword =
      bcrypt.hashSync(users[user].plainPassword, saltRounds);

  // only user over or equal to level 1 can access basic-auth
  if (users[user].level >= 1) {
    basicAuthUsers[users[user].username] = users[user].plainPassword;
  }
}

// http basuc-auth, all realms
const basic = (basicAuth({
  users: basicAuthUsers,
  unauthorizedResponse: getUnauthorizedResponse,
  challenge: true,
}));

const auth_router = express.Router();

// login route
auth_router.post('/auth/login', async (req, res) => {
  const {username, password} = req.body;

  for (const user in users) {
    // safe comapre username
    if (basicAuth.safeCompare(username, users[user].username)) {
      // async hashed+salted passwd compare
      if ((await bcrypt.compare(password, users[user].hashedPassword)) ===
          true) {
        // generate jwt
        const token = jwt.sign(
            {'username': username, 'level': users[user].level}, privateKey,
            tokenOptions);

        // set jwt cookie, only set as secure in prod
        res.cookie('x-auth-token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        });

        // redurcet back to "/", now accessing "/private"
        res.status(200).send({message: '/'});
        return;
      }
    }
  }

  // deter side-channel attacks for failed logins, by delaying for a random
  // amount of time
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 2500));
  res.status(401).send({message: 'failure'});
});

// logout route
auth_router.post('/auth/logout', (req, res) => {
  res.cookie('x-auth-token', '', {
    expires: new Date(Date.now() - 1000)
  });  // Set the cookie to expire immediately
  res.status(200).send({message: '/'});
});

module.exports = {
  authenticate,
  authenticateToken,
  auth_router,
  basic
}
