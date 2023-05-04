const SteamAPI = require('steamapi');
const API_KEY = require('./secret').STEAM_API_KEY;
const steam = new SteamAPI(API_KEY);
const useJSON = require('./useJSON');

const batchSize = 200; // 한 번에 처리할 게임 개수
const interval = 5 * 60 * 1000; // API 호출 간격 (밀리초 단위)
const delay = 10 * 60 * 1000; // API 호출 제한 시간 (밀리초 단위)
let appIDs = []; // 모든 게임의 app ID
let appNames = []; // 모든 게임의 이름
let appSystemRequirements = []; // 모든 게임의 시스템 요구사항
let cnt = 0;
let fail_cnt = 0;

// Steam에서 게임 리스트를 가져옴
steam.getAppList().then(apps => {
    appIDs = apps.map(app => app.appid);
    appNames = apps.map(app => app.name);

    useJSON.writeJSON(apps, 'games.json');

    // 일정 시간 후 다음 API를 호출
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
        if(endIndex + batchSize < appIDs.length) {
            setTimeout(() => getNextBatch(endIndex), interval);
        } else if (endIndex < appIDs.length) {
            setTimeout(() => getNextBatch(endIndex).then(() => { useJSON.writeJSON(appSystemRequirements, 'game.json'); }), interval);
        } 
        
        console.log('cnt:', cnt, '\nfail_cnt:', fail_cnt);
        return Promise.all(promises); // promises 배열을 반환함
    };

    // 호출
    getNextBatch(apps.length - 201)
}).catch(error => {
    console.log(error);
});

/** 문자열에서 필요한 정보 추출 */
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

