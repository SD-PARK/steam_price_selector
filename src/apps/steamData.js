const SteamAPI = require('steamapi');
const API_KEY = require('../../config/secret').STEAM_API_KEY;
const steam = new SteamAPI(API_KEY);
const useJSON = require('./useJSON');

const batchSize = 200; // 한 번에 처리할 게임 개수
const interval = (5 * 60 * 1000) + 1000; // API 호출 간격 (밀리초 단위)
let appIDs = []; // 모든 게임의 app ID
let appNames = []; // 모든 게임의 이름
let appInfos = []; // 새로 저장할 게임의 시스템 요구사항

/** 신규 게임 데이터를 업데이트합니다. */
const updateGameData = async () => {
    await getAppList();
    appInfos = await useJSON.readJSON('gameData.json');
    const omissions = await omissionCheck();
    for (const id of omissions) {
        // 오류 검사
        if (appInfos.find((app) => {app.id === id})) {
            console.log(`\n\n\n\n\n${id} is Duplicate value!!!!!\n\n\n\n\n`);
            continue;
        }

        await steam.getGameDetails(id)
        .then(details => {
            const minimum = details.pc_requirements.minimum;
            const recommended = details.pc_requirements.recommended;
            const minimumRequirementsObject = extractData(minimum);
            const recommendedRequirementsObject = extractData(recommended);

            appInfos.push({
                name: appNames[appIDs.indexOf(id)],
                id: id,
                is_free: details.is_free,
                supported_languages: details.supported_languages,
                header_image: details.header_image,
                requirements: {
                    minimum: minimumRequirementsObject,
                    recommended: recommendedRequirementsObject
                },
                price_overview: details.price_overview,
                categories: details.categories,
                genres: details.genres
            });
            console.log('Push Completed! app ID', id);
        })
        .catch(error => {
            if (error.message === 'No app found') {
                appInfos.push({
                    name: appNames[appIDs.indexOf(id)],
                    id: id,
                    requirements: {},
                });
                console.log(`Invalid app ID ${id}, skipping...`);
            } else {
                throw error;
            }
        });
    }
    await useJSON.writeJSON(appInfos, 'gameData.json');
}

/** 게임 데이터를 전체 게임 리스트와 비교해 끊긴 부분부터 이어서 불러와 저장 */
const writeGameDataContinue = async () => {
    const games = await useJSON.readJSON('games.json');
    appIDs = games.map(game => game.appid);
    appNames = games.map(game => game.name);

    appInfos = await useJSON.readJSON('gameData.json');
    
    const startIndex = appInfos.length;
    if (startIndex < appIDs.length) {
        console.log('Continue indexing from', startIndex);
        await getNextBatch(startIndex).then(async () => { await useJSON.writeJSON(appInfos, 'gameData.json'); });
    } else {
        console.log('GameData Upload Completed!');
    }
}

/** 누락된 데이터 검사 */
const omissionCheck = async () => {
    const games = await useJSON.readJSON('games.json');
    appIDs = games.map(game => game.appid);
    const gameData = await useJSON.readJSON('gameData.json');
    const compareIDs = gameData.map(app => app.id);

    let omissionList = [];

    appIDs.map(appID => {
        if (!compareIDs.find(compareID => {compareID === appID}))
            omissionList.push(appID);
    });

    console.log('omission List:\n', omissionList);
    return omissionList;
}

/** Steam에서 서비스 중인 모든 게임 리스트를 가져옵니다. */
async function getAppList() {
    return steam.getAppList().then(async apps => {
        await useJSON.writeJSON(apps, 'games.json');
    }).catch(error => {
        console.log(error);
    });
}

/** 게임의 세부 데이터를 불러와 gameData.json에 저장합니다. !!호출 전 반드시 appIDs와 appNames를 초기화할 것!! */
async function getNextBatch(startIndex) {
    const endIndex = Math.min(startIndex + batchSize, appIDs.length);
    const batchIDs = appIDs.slice(startIndex, endIndex);
    
    // 다음 호출을 예약, 호출을 마치면 JSON 파일에 저장
    if (endIndex < appIDs.length) {
        setTimeout(() => getNextBatch(endIndex).then(async () => { await useJSON.writeJSON(appInfos, 'gameData.json'); }), interval);
    }

    // API 호출
    // 'Promise.all'을 사용할 때 'map' 함수를 사용해 배열을 순회하며 각 요소를 비동기적으로 처리할 수 있지만, 내부적으로는 병렬적으로 처리되기 때문에 결과의 순서가 보장되지 않음.
    // 따라서 전체 게임 리스트(games.json)과 세부 데이터(gameData.json)의 배열 순서를 보장하기 위해 for of 사용.
    for (const id of batchIDs) {
        // 오류 검사
        if (appInfos.find((app) => {app.id === id}))
            throw `\n\n\n\n\n${id} is Duplicate value!!!!!\n\n\n\n\n`;

        await steam.getGameDetails(id)
        .then(details => {
            const minimum = details.pc_requirements.minimum;
            const recommended = details.pc_requirements.recommended;
            const minimumRequirementsObject = extractData(minimum);
            const recommendedRequirementsObject = extractData(recommended);

            appInfos.push({
                name: appNames[appIDs.indexOf(id)],
                id: id,
                is_free: details.is_free,
                supported_languages: details.supported_languages,
                header_image: details.header_image,
                requirements: {
                    minimum: minimumRequirementsObject,
                    recommended: recommendedRequirementsObject
                },
                price_overview: details.price_overview,
                categories: details.categories,
                genres: details.genres
            });
            console.log('Push Completed! app ID', id);
        })
        .catch(error => {
            if (error.message === 'No app found') {
                appInfos.push({
                    name: appNames[appIDs.indexOf(id)],
                    id: id,
                    requirements: {},
                });
                console.log(`Invalid app ID ${id}, skipping...`);
            } else {
                throw error;
            }
        });
    }
};

/** 시스템 요구사항에서 필요한 정보 추출 */
function extractData(requirements) {
    if (!requirements) return {};

    const OSMatch = requirements.match(/<strong>OS:<\/strong>(.*?)<br>/);
    const OS = OSMatch ? OSMatch[1].trim() : '';

    const ProcessorMatch = requirements.match(/<strong>Processor:<\/strong>(.*?)<br>/);
    const Processor = ProcessorMatch ? ProcessorMatch[1].trim() : '';

    const MemoryMatch = requirements.match(/<strong>Memory:<\/strong>(.*?)<br>/);
    const Memory = MemoryMatch ? MemoryMatch[1].trim() : '';

    const GraphicsMatch = requirements.match(/<strong>Graphics:<\/strong>(.*?)<br>/);
    const Graphics = GraphicsMatch ? GraphicsMatch[1].trim() : '';

    const DirectXMatch = requirements.match(/<strong>DirectX:<\/strong>(.*?)<br>/);
    const DirectX = DirectXMatch ? DirectXMatch[1].trim() : '';

    const StorageMatch = requirements.match(/<strong>Storage:<\/strong>(.*?)<br>/);
    const Storage = StorageMatch ? StorageMatch[1].trim() : '';

    const RequirementsObject = {
        OS: OS,
        Processor: Processor.split(/(Intel|AMD)\s.*?(?=\s\()/),
        Memory: Memory,
        Graphics: Graphics.split(/,| or |\/|\s/),
        DirectX: DirectX,
        Storage: Storage
    }

    return RequirementsObject;
}

module.exports = {
    updateGameData,
    writeGameDataContinue,
    omissionCheck
}