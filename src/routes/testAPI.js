const router = require('express').Router();
const useJSON = require('../apps/useJSON');
// require('../apps/gpuUpdate')(); // GPU Data 갱신
require('../apps/steamData').checkSingleApp(10); // Steam Data 갱신
// require('../apps/steamData').checkSingleApp(271590); // Steam Data 갱신
// require('../apps/steamData').checkSingleApp(990080); // Steam Data 갱신
// require('../apps/steamData').checkSingleApp(1150530); // Steam Data 갱신
// require('../apps/steamData').checkSingleApp(1415280); // Steam Data 갱신
// require('../apps/steamData').findOmission();

router.get('/', async (req, res) => {
    // res.send('This Message from the Router.');
    const gpuData = await useJSON.readJSON('gpuData.json');

    let factor = 'GeForce RTX 3060';
    let data = gpuData.find((element) => { if(element.name === factor) return true; });
    res.send(data);
    console.log(data);
});

function isData(element, factor) {
}

module.exports = router;