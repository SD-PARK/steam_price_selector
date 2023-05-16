const router = require('express').Router();
const useJSON = require('../apps/useJSON');
// require('../apps/benchmarkCrawler').cpuUpdate(); // CPU Data 갱신
// require('../apps/benchmarkCrawler').gpuUpdate(); // GPU Data 갱신
// require('../apps/gameDetailsFetcher').checkSingleApp(10); // Steam Data 갱신 // Counter-Strike
// require('../apps/gameDetailsFetcher').checkSingleApp(271590); // Steam Data 갱신 // Grand Theft Auto 5
// require('../apps/gameDetailsFetcher').checkSingleApp(990080); // Steam Data 갱신 // Hogwarts Legacy
// require('../apps/gameDetailsFetcher').checkSingleApp(2369390); // Steam Data 갱신 // Farcry 6
// require('../apps/gameDetailsFetcher').checkSingleApp(1150530); // Steam Data 갱신 // Wizard with a Gun
// require('../apps/gameDetailsFetcher').checkSingleApp(1415280); // Steam Data 갱신 // Faerie Afterlight
// require('../apps/gameDetailsFetcher').findOmission();
require('../apps/gameDetailsFetcher').continueWritingGameData();

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