const router = require('express').Router();
const apiController = require('./_controller/apiController');

router.post('/games', apiController.validateInputMiddleware, apiController.postGames);

module.exports = router;