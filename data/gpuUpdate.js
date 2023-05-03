const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

/** PassMark GPU Data 크롤링 */
module.exports = async () => {
    try {
        const html = await axios.get('https://www.videocardbenchmark.net/gpu_list.php');
        let ulList = [];

        const $ = cheerio.load(html.data);

        const bodyList = $('tbody > tr');
        bodyList.map((i, element) => {
            ulList[i] = {
                name: $(element).find('td:nth-child(1) > a').text(),
                value: $(element).find('td:nth-child(2)').text()
            }
        });
        console.log("bodyList: ", ulList);
        updateJson(ulList);
    } catch {
        console.error(error);
    }
}

/** gpu.json 업데이트 */
const updateJson = (gpu_list) => {
    const gpuJSON = JSON.stringify(gpu_list);
    fs.writeFileSync('./data/gpu.json', gpuJSON);
}