const router = require('express').Router();
// const gpu = require('../data/gpuUpdate')(); // GPU 데이터 갱신
const fs = require('fs');

router.get('/', (req, res) => {
    // res.send('This Message from the Router.');
    const jsonFile = fs.readFileSync('./data/gpu.json');
    const gpuData = JSON.parse(jsonFile);

    let factor = 'GeForce RTX 3060';
    let data = gpuData.find((element) => { if(element.name === factor) return true; });
    res.send(data);
    console.log(data);
});

function isData(element, factor) {
}

module.exports = router;