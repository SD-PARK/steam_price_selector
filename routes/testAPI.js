const router = require('express').Router();
const useJSON = require('../config/useJSON');
// require('../config/gpuUpdate')(); // GPU Data 갱신
require('../config/steamData'); // Steam Data 갱신

router.get('/', (req, res) => {
    // res.send('This Message from the Router.');
    const gpuData = useJSON.readJSON('gpu.json');

    let factor = 'GeForce RTX 3060';
    let data = gpuData.find((element) => { if(element.name === factor) return true; });
    res.send(data);
    console.log(data);
});

function isData(element, factor) {
}

module.exports = router;