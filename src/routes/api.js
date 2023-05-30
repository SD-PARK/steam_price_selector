const router = require('express').Router();
const apiController = require('./_controller/apiController');

router.get('/update', apiController.updateGameFiles);
router.post('/games', apiController.validateInputMiddleware, apiController.postGames);

module.exports = router;