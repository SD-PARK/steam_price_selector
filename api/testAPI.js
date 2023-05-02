const router = require('express').Router();

router.get('/', (req, res) => {
    res.send('This Message from the Router.');
});

module.exports = router;