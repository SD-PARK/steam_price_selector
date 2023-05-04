const fs = require('fs');

module.exports = {
    /** JSON 파일 덮어쓰기 */
    writeJSON: function(apps, fileName) {
        const json = JSON.stringify(apps);
        fs.writeFileSync('./data/' + fileName, json);
        console.log("Write Completed!:", fileName);
    },

    /** JSON 파일 이어쓰기 */
    updateJSON: function(apps, fileName) {
        const json = JSON.stringify(apps);
        fs.appendFile('./data/' + fileName, json);
        console.log("Update Completed!:", fileName);
    },

    /** JSON 파일 읽어오기 */
    readJSON: function(fileName) {
        const jsonFile = fs.readFileSync('./data/' + fileName);
        return JSON.parse(jsonFile);
    }
}