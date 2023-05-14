const SteamAPI = require('steamapi');
const API_KEY = require('../../config/secret').STEAM_API_KEY;
const steam = new SteamAPI(API_KEY);
const useJSON = require('./useJSON');

const batchSize = 200; // 한 번에 처리할 게임 개수
const interval = (5 * 60 * 1000) + 1000; // API 호출 간격 (밀리초 단위)
let appIDs = []; // 모든 게임의 app ID
let appNames = []; // 모든 게임의 이름
let appInfos = []; // 새로 저장할 게임의 시스템 요구사항

/**
 * 게임 데이터를 업데이트합니다. 게임 목록을 가져와 JSON 파일에 저장한 후, 작성되지 않은 게임들의 정보를 API를 통해 가져와 게임 데이터를 추가합니다.
 * 추가된 게임 데이터는 JSON 파일에 저장됩니다.
 */
const updateGameDatabase = async () => {
    await fetchAppList();
    appInfos = await useJSON.readJSON('gameData.json');
    const omissions = await findOmission();
    for (const id of omissions) {
        if (appInfos.find((app) => {app.id === id})) {
            console.log(`\n\n\n\n\n${id} is Duplicate value!!!!!\n\n\n\n\n`);
            continue;
        }

        fetchGameDetails(id);
    }
    await useJSON.writeJSON(appInfos, 'gameData.json');
}

/**
 * 게임 데이터 작성 작업을 계속 진행합니다. JSON 파일에서 게임 목록을 읽어와 필요한 정보를 추출하고, 지금까지 작성된 게임 데이터를 불러옵니다.
 * 이어서 작성 작업을 진행하며, 아직 작성되지 않은 게임들의 정보를 API를 통해 가져와 JSON 파일에 추가합니다.
 */
const continueWritingGameData = async () => {
    const games = await useJSON.readJSON('games.json');
    appIDs = games.map(game => game.appid);
    appNames = games.map(game => game.name);
    appInfos = await useJSON.readJSON('gameData.json');
    
    const startIndex = appInfos.length;
    if (startIndex < appIDs.length) {
        console.log('Continue indexing from', startIndex);
        await processNextBatch(startIndex).then(async () => { await useJSON.writeJSON(appInfos, 'gameData.json'); });
    } else {
        console.log('GameData Upload Completed!');
    }
}

/**
 * JSON 파일에서 게임 목록을 읽어와 `gameData.json` 파일에서 누락된 게임 ID를 찾아 출력 및 반환합니다.
 *
 * @returns {Promise<number[]>} - 누락된 게임 ID 목록
 */
const findOmission = async () => {
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

/**
 * 특정 게임의 상세 정보를 가져와 `fetchGameDetails()` 함수를 사용하여 처리한 후, 콘솔을 통해 출력합니다.
 *
 * @param {number} id - 게임의 ID
 * @returns {Promise<void>}
 */
const checkSingleApp = async (id) => {
    await fetchGameDetails(id);
    console.log(appInfos);
}

/**
 * 게임 목록을 가져와 JSON 파일에 저장하는 비동기 함수입니다.
 *
 * @returns {Promise<void>}
 */
async function fetchAppList() {
    return steam.getAppList().then(async apps => {
        await useJSON.writeJSON(apps, 'games.json');
    }).catch(error => {
        console.log(error);
    });
}

/**
 * 다음 일괄 처리를 수행하는 비동기 함수입니다.
 * 시작 인덱스를 기준으로 일괄 처리할 게임 ID를 가져온 다음, API를 호출하여 게임 세부 정보를 추출합니다.
 * 이후 다음 일괄 처리를 예약하고, 모든 호출이 완료되면 추출된 정보를 JSON 파일에 저장합니다.
 * 
 * !!호출하기 전 반드시 appIDs, appNames 변수를 초기화해주어야 합니다.
 *
 * @param {number} startIndex - 일괄 처리의 시작 인덱스
 * @returns {Promise<void>}
 */
async function processNextBatch(startIndex) {
    const endIndex = Math.min(startIndex + batchSize, appIDs.length);
    const batchIDs = appIDs.slice(startIndex, endIndex);
    
    if (endIndex < appIDs.length) {
        setTimeout(() => processNextBatch(endIndex).then(async () => { await useJSON.writeJSON(appInfos, 'gameData.json'); }), interval);
    }

    for (const id of batchIDs) {
        if (appInfos.find((app) => {app.id === id}))
            throw `\n\n\n\n\n${id} is Duplicate value!!!!!\n\n\n\n\n`;

        fetchGameDetails(id);
    }
};

/**
 * 지정된 게임 ID에 대한 게임 세부 정보를 가져오는 비동기 함수입니다.
 * Steam API를 사용하여 게임 세부 정보를 요청하고, 요구 사항과 다른 세부 정보를 추출하여 객체에 저장합니다.
 * 추출된 정보는 appInfos 배열에 추가되며, 에러가 발생한 경우에도 해당 정보는 저장됩니다.
 *
 * @param {number} id - 가져올 게임의 고유 ID
 * @returns {Promise<void>}
 */
async function fetchGameDetails(id) {
    await steam.getGameDetails(id)
        .then(details => {
            const minimum = details.pc_requirements.minimum;
            const recommended = details.pc_requirements.recommended;
            const minimumRequirementsObject = extractRequirements(minimum);
            const recommendedRequirementsObject = extractRequirements(recommended);
            appInfos.push({
                name: appNames[appIDs.indexOf(id)],
                id: id,
                is_free: details.is_free,
                supported_languages: extractSupportedLanguages(details.supported_languages),
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
            appInfos.push({
                name: appNames[appIDs.indexOf(id)],
                id: id,
                requirements: {},
            });
            if (error.message === 'No app found') console.log(`Invalid app ID ${id}, skipping...`);
            else console.log(error);
        });
}

/**
 * 주어진 입력 문자열에서 영어 언어를 추출하여 배열 형태로 반환하는 함수입니다.
 * 
 * @param {string} input - 추출할 언어를 포함한 입력 문자열
 * @returns {string[]} - 추출된 영어 언어 배열
 */
function extractSupportedLanguages(input) {
    const languageRegex = /([A-Za-z\s-]+)(?=<strong>\*<\/strong>?)/g;
    const matches = input.match(languageRegex);
    const languages = matches ? matches.map(match => match.trim()) : [];
    return languages;
}

/**
 * 주어진 입력 문자열에서 시스템 요구 사항 데이터를 추출하여 객체 형태로 반환하는 함수입니다.
 * 
 * @param {string} input - 추출할 시스템 요구 사항을 포함한 입력 문자열
 * @returns {Object} - 추출된 시스템 요구 사항 객체
 */
function extractRequirements(input) {
    if (!input) return {};

    const OSMatch = input.match(/<strong>OS:<\/strong>(.*?)<br>/);
    const OS = OSMatch ? OSMatch[1].trim() : '';

    const ProcessorMatch = input.match(/<strong>Processor:<\/strong>(.*?)<br>/);
    const Processor = ProcessorMatch ? ProcessorMatch[1].trim() : '';

    const MemoryMatch = input.match(/<strong>Memory:<\/strong>(.*?)<br>/);
    const Memory = MemoryMatch ? MemoryMatch[1].trim() : '';

    const GraphicsMatch = input.match(/<strong>Graphics:<\/strong>(.*?)<br>/);
    const Graphics = GraphicsMatch ? GraphicsMatch[1].trim() : '';

    const DirectXMatch = input.match(/<strong>DirectX:<\/strong>(.*?)<br>/);
    const DirectX = DirectXMatch ? DirectXMatch[1].trim() : '';

    const StorageMatch = input.match(/<strong>Storage:<\/strong>(.*?)<br>/);
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
    updateGameDatabase,
    continueWritingGameData,
    findOmission,
    checkSingleApp
}