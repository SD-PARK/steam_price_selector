const router = require('express').Router();

const gpu = require('../data/gpu');

router.get('/', (req, res) => {
    // res.send('This Message from the Router.');
    data = gpu.find(isData);
    res.send(data);
});

function isData(element) {
    if(element.name === 'GeForce RTX 3060') {
        return true;
    }
}

module.exports = router;