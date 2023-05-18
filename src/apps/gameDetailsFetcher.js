const SteamAPI = require('steamapi');
const API_KEY = require('../../config/secret').STEAM_API_KEY;
const steam = new SteamAPI(API_KEY);
const useJSON = require('./useJSON');

const batchSize = 200; // 한 번에 처리할 게임 개수
const interval = (5 * 60 * 1000) + 1000; // API 호출 간격 (밀리초 단위)
let appIDs = []; // 모든 게임의 app ID
let appNames = []; // 모든 게임의 이름
let appInfos = []; // 새로 저장할 게임의 시스템 요구사항

// 시스템 요구사항과의 비교를 위한 변수
let gpuList = []; // GPU 리스트
let cpuList = []; // CPU 리스트

/**
 * 게임 데이터를 업데이트합니다. 게임 목록을 가져와 JSON 파일에 저장한 후, 작성되지 않은 게임들의 정보를 API를 통해 가져와 게임 데이터를 추가합니다.
 * 추가된 게임 데이터는 JSON 파일에 저장됩니다.
 */
const updateGameDatabase = async () => {
    await fetchAppList();
    appInfos = await useJSON.readJSON('gameData.json');
    const omissions = await findOmission();
    appIDs = omissions.map(game => game.appid);
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
 * 게임 데이터 작성 작업을 이어서 진행합니다. 'findOmission()' 함수를 통해 아직 작성되지 않은 데이터를 추출하고,
 * 작성된 게임 데이터 파일이 저장되어 있는 JSON 파일을 불러옵니다.
 * 이후 아직 작성되지 않은 게임들의 정보를 API를 통해 가져와 JSON 파일에 추가합니다.
 */
const continueWritingGameData = async () => {
    const games = await findOmission();
    appIDs = games.map(game => game.appid);
    appNames = games.map(game => game.name);
    appInfos = await useJSON.readJSON('gameData.json');
    
    if (appIDs.length > 0) {
        console.log('Unwritten data:', appIDs.length);
        await processNextBatch(0).then(async () => { await useJSON.writeJSON(appInfos, 'gameData.json'); });
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
    const gameData = await useJSON.readJSON('gameData.json');
    const compareIDs = gameData.map(app => app.id);

    let omissionList = games.filter(game => !compareIDs.find(id => id === game.appid));

    // console.log('omission List:\n', omissionList);
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
    useJSON.writeJSON(appInfos, 'singleGameData.json');
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
 * 일괄 처리를 수행하는 비동기 함수입니다.
 * 시작 인덱스를 기준으로 일괄 처리할 게임 ID를 가져온 다음, API를 호출하여 게임 세부 정보를 추출합니다.
 * 이후 다음 일괄 처리를 예약하고, 모든 호출이 완료되면 추출된 정보를 JSON 파일에 저장합니다.
 * 
 * !!호출하기 전 반드시 appIDs, appNames 변수를 초기화해주어야 합니다.
 *
 * @param {number} startIndex - 일괄 처리의 시작 인덱스
 * @returns {Promise<Array>}
 */
async function processNextBatch(startIndex) {
    const endIndex = Math.min(startIndex + batchSize, appIDs.length);
    const batchIDs = appIDs.slice(startIndex, endIndex);
    
    if (endIndex < appIDs.length) {
        setTimeout(() => processNextBatch(endIndex).then(async () => {
            await useJSON.writeJSON(appInfos, 'gameData.json');
        }), interval);
    }

    const promises = batchIDs.map(id => fetchGameDetails(id))
    return Promise.all(promises);
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
        .then(async details => {
            const minimum = details.pc_requirements.minimum;
            const recommended = details.pc_requirements.recommended;
            const minimumRequirementsObject = await extractRequirements(minimum);
            const recommendedRequirementsObject = await extractRequirements(recommended);
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
                categories: details.categories,
                genres: details.genres
            });
            console.log('Push Completed! app ID', id);
        })
        .catch(error => {
            appInfos.push({
                name: appNames[appIDs.indexOf(id)],
                id: id
            });
            if (error.message === 'Too Many Requests') throw error;
            else if (error.message === 'No app found') console.log(`Invalid app ID ${id}, skipping...`);
            else console.log(error);
        });
}

/**
 * 주어진 입력 문자열에서 언어를 추출하여 배열 형태로 반환하는 함수입니다.
 * 
 * @param {string} input - 추출할 언어를 포함한 입력 문자열
 * @returns {string[]} - 추출된 언어 배열
 */
function extractSupportedLanguages(input) {
    if(!input) return undefined;
    const words = input.includes("<br>") ? input.split("<br>")[0] : input;
    const languages = words.split(', ').map(str => str.includes('<strong>') ? str.split("<strong>")[0] : str);
    return languages;
}

/**
 * 주어진 입력 문자열에서 시스템 요구 사항 데이터를 추출하여 객체 형태로 반환하는 비동기 함수입니다.
 * 
 * @param {string} input - 추출할 시스템 요구 사항을 포함한 입력 문자열
 * @returns {Object} - 추출된 시스템 요구 사항 객체
 */
async function extractRequirements(input) {
    if (!input) return {};

    const OSMatch = input.match(/<strong>OS:<\/strong>(.*?)</);
    const OS = OSMatch ? OSMatch[1].trim() : '';

    const ProcessorMatch = input.match(/<strong>Processor:<\/strong>(.*?)</);
    const Processor = ProcessorMatch ? ProcessorMatch[1].trim() : '';

    const MemoryMatch = input.match(/<strong>Memory:<\/strong>(.*?)</);
    const Memory = MemoryMatch ? MemoryMatch[1].trim() : '';

    const GraphicsMatch = input.match(/<strong>Graphics:<\/strong>(.*?)</);
    const Graphics = GraphicsMatch ? GraphicsMatch[1].trim() : '';

    const StorageMatch = input.match(/<strong>Storage:<\/strong>(.*?)</);
    const Storage = StorageMatch ? StorageMatch[1].trim() : '';

    const RequirementsObject = {
        OS: extractOS(OS),
        Processor: await extractProcessor(Processor),
        Memory: extractMemory(Memory),
        Graphics: await extractGraphics(Graphics),
        Storage: extractMemory(Storage)
    }
    return RequirementsObject;
}

/**
 * 주어진 문자열에서 OS 버전과 bit 정보를 추출하여 객체 형태로 반환하는 함수입니다.
 * 
 * @param {string} input - 추출할 OS 버전과 bit 정보을 포함한 입력 문자열
 * @returns {object} - 추출된 OS 버전과 bit 정보
 */
function extractOS(input) {
    const versionOrder = ['Vista', '7', '8', '8.1', '10', '11'];

    const versionRegex = /Windows (Vista|7|8\.1|10|11)/gi;
    const bitRegex = /(\d+) Bit/i;

    let versions = [];
    let bit = '64';

    // 윈도우 버전 추출
    const versionMatches = input.matchAll(versionRegex);
    for (const match of versionMatches) {
        versions.push(match[1]);
    }

    // 윈도우 버전 중에서 최소 버전인지 확인
    let minVersion = '';
    for (const version of versionOrder) {
        if (versions.includes(version)) {
            minVersion = version;
            break;
        }
    }

    // 비트 정보 추출
    const bitMatch = input.match(bitRegex);
    if (bitMatch) {
        bit = bitMatch[1];
    }

    return { version: minVersion, bit };
}

/**
 * 주어진 문자열에 포함된 CPU 정보를 추출하는 비동기 함수입니다.
 * cpuList 배열에 저장된 CPU 데이터를 활용하여 입력 문자열에 해당하는 CPU를 찾습니다.
 * 
 * @param {string} input - CPU를 검색할 문자열
 * @returns {Array} - 입력 문자열에 포함된 CPU 데이터 배열
 */
async function extractProcessor(input) {
    if (cpuList.length < 1) {
        cpuList = await useJSON.readJSON('cpuData.json');
    }

    let regex = /(\d+(\.\d{1,2})?)ghz/g;
    let modifiedInput = input.toLowerCase().replace(regex, (match, p1) => {
        const number = parseFloat(p1).toFixed(2);
        return number + "ghz";
    });
    modifiedInput = modifiedInput.replace(/[ -]/g, '');

    let processor;
    cpuList.forEach(data => {
        const modifiedDataName = data.name.replace(/[ -]/g, '').toLowerCase();
        if (modifiedInput.includes(modifiedDataName) && (!processor || processor.value < data.value))
            processor = data;
    });

    return processor;
}

/**
 * 주어진 문자열에서 메모리 용량을 추출하는 함수입니다.
 * 
 * @param {string} input - 추출할 메모리 용량이 포함된 문자열
 * @returns {number} - 추출된 메모리 용량 (단위: MB)
 */
function extractMemory(input) {
    const volumnMatch = input.match(/\d+/);
    const byte = input.match(/(MB|GB|TB)/);

    if (volumnMatch && byte) {
        const volumn = parseInt(volumnMatch[0]);
        const unit = byte[0];

        switch (unit) {
            case 'GB':
                return volumn * 1024;
            case 'TB':
                return volumn * 1024 * 1024;
            default:
                return volumn;
        }
    }

    return 0;
}

/**
 * 주어진 문자열에 포함된 그래픽 카드 정보를 추출하는 비동기 함수입니다.
 * gpuList 배열에 저장된 그래픽 카드 데이터를 활용하여 입력 문자열에 해당하는 그래픽 카드를 찾습니다.
 * 
 * @param {string} input - 그래픽 카드를 검색할 문자열
 * @returns {Array} - 입력 문자열에 포함된 그래픽 카드 데이터 배열
 */
async function extractGraphics(input) {
    if (gpuList.length < 1) {
        gpuList = await useJSON.readJSON('gpuData.json');
    }

    const modifiedInput = input.toLowerCase().replace(/nvidia/g, "geforce");

    let graphic;
    gpuList.forEach(data => {
        if(modifiedInput.includes(data.name.toLowerCase()) && (!graphic || graphic.value < data.value))
            graphic = data;
    });

    return graphic;
}

module.exports = {
    updateGameDatabase,
    continueWritingGameData,
    findOmission,
    checkSingleApp
}