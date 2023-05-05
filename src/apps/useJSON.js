const fs = require('fs');

module.exports = {
    /** JSON 파일 덮어쓰기 */
    writeJSON: async function(apps, fileName) {
        const json = JSON.stringify(apps);
        await fs.promises.writeFileSync('./data/' + fileName, json);
        console.log("Write Completed!:", fileName);
    },

    /** JSON 파일 이어쓰기 */
    updateJSON: async function(apps, fileName) {
        const json = JSON.stringify(apps);
        await fs.promises.appendFile('./data/' + fileName, json);
        console.log("Update Completed!:", fileName);
    },

    /** JSON 파일 읽어오기 */
    readJSON: async function(fileName) {
        const jsonFile = await fs.promises.readFileSync('./data/' + fileName);
        return JSON.parse(jsonFile);
    }
}