const path = require('path');
const express = require('express');

const router = express.Router();

const root = path.join(__dirname, '../www');

// global access to favicon
const faviconPath = path.join(root, 'public/assets/favicon.ico');
router.use('/favicon.ico', express.static(faviconPath));

const robotsPath = path.join(root, 'public/robots.txt');
router.use('/robots.txt', express.static(robotsPath));

// serve public/private dir depending on user auth status
const publicPath = path.join(root, 'public');
const privatePath = path.join(root, 'private');

router.use('/', (req, res, next) => {
  const rootDir = req.user ? privatePath : publicPath;
  express.static(rootDir)(req, res, next);
});

module.exports = router;
