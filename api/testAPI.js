const router = require('express').Router();

const gpu = require('../data/gpu');

router.get('/', (req, res) => {
    // res.send('This Message from the Router.');
    let name = 'GeForce RTX 306';
    data = gpu.find((element) => {
        if(element.name === name) {
            return true;
        }
    });
    res.send(data?.value ?? '0');
    console.log(data?.value ?? 0);
});

module.exports = router;