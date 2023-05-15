const axios = require('axios');
const cheerio = require('cheerio');
const useJSON = require('./useJSON');

/** PassMark Data 크롤링 */
async function updateData(url, fileName) {
    try {
        const html = await axios.get(url);
        const ulList = [];

        const $ = cheerio.load(html.data);

        const bodyList = $('tbody > tr');
        bodyList.each((i, element) => {
            const valueText = $(element).find('td:nth-child(2)').text();
            const value = parseInt(valueText.replace(/,/g, ''));
            ulList.push({
                name: $(element).find('td:nth-child(1) > a').text(),
                value: value
            });
        });

        await useJSON.writeJSON(ulList, fileName);
    } catch {
        console.error(error);
    }
}

module.exports = {
    async cpuUpdate() {
        await updateData('https://www.cpubenchmark.net/cpu_list.php', 'cpuData.json');
    },
    async gpuUpdate() {
        await updateData('https://www.videocardbenchmark.net/gpu_list.php', 'gpuData.json');
    }
}