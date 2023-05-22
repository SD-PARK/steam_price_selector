const router = require('express').Router();
const apiController = require('./apiController');

router.get('/', async (req, res) => apiController.getGames);
router.post('/', async (req, res) => apiController.postGames);

module.exports = router;