const router = require('express').Router();
const apiController = require('./_controller/apiController');

router.get('/', (req, res) => {
    res.send('good');
});
router.post('/games', apiController.validateInputMiddleware, apiController.postGames);

module.exports = router;