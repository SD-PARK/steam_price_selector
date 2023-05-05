const SteamAPI = require('steamapi');
const API_KEY = require('../../config/secret').STEAM_API_KEY;
const steam = new SteamAPI(API_KEY);
const useJSON = require('./useJSON');

const batchSize = 200; // 한 번에 처리할 게임 개수
const interval = 5 * 60 * 1000; // API 호출 간격 (밀리초 단위)
let appIDs = []; // 모든 게임의 app ID
let appNames = []; // 모든 게임의 이름
let appSystemRequirements = []; // 모든 게임의 시스템 요구사항
let cnt = 0;
let fail_cnt = 0;

const writeDataContinue = async () => {
    const games = await useJSON.readJSON('games.json');
    appIDs = games.map(game => game.appid);
    appNames = games.map(game => game.name);

    appSystemRequirements = await useJSON.readJSON('game.json');
    
    const startIndex = appSystemRequirements.length;
    await getNextBatch(startIndex).then(async () => { await useJSON.writeJSON(appSystemRequirements, 'game.json'); });
}

/** Steam에서 서비스 중인 모든 게임 리스트를 가져옵니다. */
const getAppList = async () => {
    return steam.getAppList().then(async apps => {
        await useJSON.writeJSON(apps, 'games.json');
    }).catch(error => {
        console.log(error);
    });
}

/** 게임의 시스템 요구 사항을 불러와 game.json에 저장 !!호출 전 반드시 appIDs와 appNames를 초기화할 것 */
const getNextBatch = (startIndex) => {
    const endIndex = Math.min(startIndex + batchSize, appIDs.length);
    const batchIDs = appIDs.slice(startIndex, endIndex);

    // API 호출
    const promises = batchIDs.map(id => {
        return steam.getGameDetails(id)
        .then(details => {
            const minimum = details.pc_requirements.minimum;
            const recommended = details.pc_requirements.recommended;
            const minimumRequirementsObject = extractData(minimum);
            const recommendedRequirementsObject = extractData(recommended);

            appSystemRequirements.push({
                name: appNames[appIDs.indexOf(id)],
                id: id,
                requirements: {
                    minimum: minimumRequirementsObject,
                    recommended: recommendedRequirementsObject
                }
            });
            cnt += 1;
            console.log(appSystemRequirements[appSystemRequirements.length - 1]);
        })
        .catch(error => {
            if (error.message === 'No app found') {
                appSystemRequirements.push({
                    name: appNames[appIDs.indexOf(id)],
                    id: id,
                    requirements: {}
                });
                fail_cnt += 1;
                console.log(`Invalid app ID ${id}, skipping...`);
            } else {
                console.log('cnt:', cnt, '\nfail_cnt:', fail_cnt);
                throw error;
            }
        });
    });
    
    // 다음 호출을 예약하고, promises 배열에 프로미스를 추가함, 호출을 마치면 JSON 파일에 저장
    if (endIndex < appIDs.length) {
        setTimeout(() => getNextBatch(endIndex).then(async () => { await useJSON.writeJSON(appSystemRequirements, 'game.json'); }), interval);
    } 
    
    return Promise.all(promises); // promises 배열을 반환함
};

/** 시스템 요구사항에서 필요한 정보 추출 */
const extractData = (requirements) => {
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

getAppList();
writeDataContinue();