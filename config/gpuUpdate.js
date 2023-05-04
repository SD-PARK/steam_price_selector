const axios = require('axios');
const cheerio = require('cheerio');
const useJSON = require('./useJSON');

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
        useJSON.writeJSON(ulList, 'gpu.json');
    } catch {
        console.error(error);
    }
}

