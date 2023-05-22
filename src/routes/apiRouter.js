const router = require('express').Router();
const apiController = require('./apiController');

router.get('/', apiController.getGames);
router.post('/', apiController.postGames);

module.exports = router;