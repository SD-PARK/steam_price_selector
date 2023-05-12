const { chromium } = require('playwright');
const SteamAPI = require('steamapi');
const API_KEY = require('../../config/secret').STEAM_API_KEY;
const steam = new SteamAPI(API_KEY);
const useJSON = require('./useJSON');

const batchSize = 20; // 한 번에 처리할 게임 개수
const interval = 0.3 * 60 * 1000; // 크롤링 호출 간격 (밀리초 단위)
let appIDs = []; // 모든 게임의 app ID
let appNames = []; // 모든 게임의 이름
let appInfos = []; // 새로 저장할 게임의 시스템 요구사항

/** 신규 게임 데이터를 업데이트합니다. */
const updateGameData = async () => {
    // await getAppList();
    // appInfos = await useJSON.readJSON('gameData.json');
    // const omissions = await omissionCheck();
    // await useJSON.writeJSON(appInfos, 'gameData.json');
}

/** 세부 데이터가 업로드되지 않은 게임 크롤링 */
const writeGameDataContinue = async () => {
    const games = omissionCheck();
    appIDs = (await games).map(game => game.appid);
    appNames = (await games).map(game => game.name);

    appInfos = await useJSON.readJSON('gameData.json');

    if (0 < appIDs.length) {
        console.log(appIDs.length, 'missing data found.')
        console.log('Continued from ID', appIDs[0]);
        await getNextBatch(0).then(async () => { await useJSON.writeJSON(appInfos, 'gameData.json'); });
    } else {
        console.log('GameData Upload Completed!');
    }
}

/** 누락된 데이터 검사 */
const omissionCheck = async () => {
    const games = await useJSON.readJSON('games.json');
    const gameData = await useJSON.readJSON('gameData.json');

    let omissionList = [];

    games.map(app => {
        if (!gameData.find(compare => {compare.id === app.appid}))
            omissionList.push(app);
    });

    return omissionList;
}

const oneAppCheck = async (id) => {
    const browser = await chromium.launch({ headless: true });
    const browserContext = await browser.newContext();
    await browserContext.addCookies(
        [
            { name: 'lastagecheckage', value: '29-1-2000', url: 'https://store.steampowered.com' },
            { name: 'birthtime', value: '946393201', url: 'https://store.steampowered.com' }
        ]
    );

    let appInfo = {};

    appInfo.id = id;
    appInfo.name = appNames[appIDs.indexOf(id)];
    const page = await browserContext.newPage();
    try {
        await page.goto(`https://store.steampowered.com/app/${id}`);
        
        if (page.url() !== 'https://store.steampowered.com/' && page.url() !== 'https://store.steampowered.com/app/' + id) {

            // ======================================== Price ==========================================
            const onSale = await page.$('.game_area_purchase_game_wrapper .discount_original_price');
            const forSale = await page.$('.game_area_purchase_game_wrapper');

            if (onSale !== null) { // 할인 중
                const priceInfo = await page.$eval('.game_purchase_discount:nth-child(1)', el => el.textContent.trim());
                const matchedPrice = /(-?\d+)%.*?([\d,]+).*?([\d,]+|$)/g.exec(priceInfo);
                appInfo.is_discount = true;
                appInfo.price = {
                    discount_pct: matchedPrice[1],
                    original_price: matchedPrice[2].replace(',', ''),
                    discount_price: matchedPrice[3].replace(',', '')
                }
            } else if (forSale) { // 판매 중
                let priceInfo = await page.$eval('.game_purchase_price:nth-child(1)', el => el.textContent.trim());
                if (priceInfo === 'Download the Free Demo') {
                    priceInfo = await page.$eval('.game_purchase_price:nth-child(2)', el => el.textContent.trim());
                }
                const matchedPrice = priceInfo.match(/\d+,\d+/);
                appInfo.is_discount = false;
                appInfo.price = {
                    original_price: parseInt(matchedPrice[0].replace(/,/g, ""))
                }
            }
            // =========================================================================================

            // ====================================== Requirement ======================================
            const requirementsInput = await page.$eval('.game_area_sys_req:nth-child(1)', el => el.textContent.trim());
            console.log(requirementsInput);
            appInfo.requirement = parseSystemRequirements(requirementsInput);
            // =========================================================================================
        }
        console.log('Push Completed! app ID', id);
    } catch (error) {
        console.error(`Error occurred while processing app ID ${id}: ${error}`);
    } finally {
        console.log(appInfo);
        await browser.close();
    }
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

    // 페이지 크롤링
    const browser = await chromium.launch({ headless: true });
    const browserContext = await browser.newContext();
    await browserContext.addCookies(
        [
            { name: 'lastagecheckage', value: '29-1-2000', url: 'https://store.steampowered.com' },
            { name: 'birthtime', value: '946393201', url: 'https://store.steampowered.com' }
        ]
    );

    const promises = batchIDs.map(async (id, index) => {
        let appInfo = {};

        // ID, NAME
        appInfo.id = id;
        appInfo.name = appNames[index];
        
        const page = await browserContext.newPage();
        try {
            await page.goto(`https://store.steampowered.com/app/${id}`);
            
            // 해당 게임의 스토어 페이지가 존재하지 않을 경우 세부 데이터 스크래핑 방지
            if (page.url() !== 'https://store.steampowered.com/' && page.url() !== 'https://store.steampowered.com/app/' + id) {
                
                // Price
                const isDiscount = await page.$('.game_area_purchase_game_wrapper .discount_original_price');
                if (isDiscount !== null) {
                    const priceInfo = await page.$eval('.game_purchase_discount:nth-child(1)', el => el.textContent.trim());
                    const matchedPrice = /(-?\d+)%.*?([\d,]+).*?([\d,]+|$)/g.exec(priceInfo);
                    appInfo.is_discount = true;
                    appInfo.price = {
                        discount_pct: matchedPrice[1],
                        original_price: matchedPrice[2].replace(',', ''),
                        discount_price: matchedPrice[3].replace(',', '')
                    }
                } else {
                    let priceInfo = await page.$eval('.game_purchase_price:nth-child(1)', el => el.textContent.trim());
                    if (priceInfo === 'Download the Free Demo') {
                        priceInfo = await page.$eval('.game_purchase_price:nth-child(2)', el => el.textContent.trim());
                    }
                    const matchedPrice = priceInfo.match(/\d+,\d+/)[0];
                    if(matchedPrice) {
                        appInfo.is_discount = false;
                        appInfo.price = {
                            original_price: parseInt(matchedPrice[0].replace(/,/g, ""))
                        }
                    }
                }
    
                // Requirement

                // 최소만 있을 때
                
                const minimum = await page.$eval('.game_area_sys_req_full:nth-child(1)', el => el.textContent.trim());
                const minimumRequirementsObject = extractData(minimum);
                
                console.log(minimumRequirementsObject);

                // 최소, 권장이 있을 때
                // .game_area_sys_req_leftCol // 최소
                // .game_area_sys_req_rightCol // 권장
                
                // const minimum = details.pc_requirements.minimum;
                // const recommended = details.pc_requirements.recommended;
                // const minimumRequirementsObject = extractData(minimum);
                // const recommendedRequirementsObject = extractData(recommended);

                //     price_overview: details.price_overview,
                //     categories: details.categories,
                //     genres: details.genres
            }
            console.log('Push Completed! app ID', id);
        } catch (error) {
            if (error.toString().includes('page.goto')) {
                throw `Error occurred while processing app ID ${id}: ${error}`;
            } else {
                console.error(`Error occurred while processing app ID ${id}: ${error}`);
            }
        } finally {
            appInfos.push(appInfo);
            console.log(appInfo);
            await page.close();
        }
    });

    // 다음 호출을 예약
    if (endIndex < appIDs.length) {
        setTimeout(() => getNextBatch(endIndex).then(async () => { await useJSON.writeJSON(appInfos, 'gameData.json'); }), interval);
    }

    return Promise.all(promises).then(async () => { await browser.close(); });
};

/**
 * 입력된 시스템 요구사항 문자열을 파싱하여 최소 요구사항과 권장 요구사항을 추출합니다.
 * @param {string} input - 시스템 요구사항 문자열
 * @returns {object} - 최소 요구사항과 권장 요구사항을 담은 객체
 */
function parseSystemRequirements(input) {
    const requirements = {
      minimum: {},
      recommended: {},
    };
  
    const minimumRegex = /Minimum:([\s\S]*?)(?=Recommended:|$)/;
    const recommendedRegex = /Recommended:([\s\S]*)/;
  
    const minimumMatch = input.match(minimumRegex);
    if (minimumMatch) {
      const minimumRequirements = minimumMatch[1].trim();
      console.log(minimumRequirements);
      requirements.minimum = extractSystemRequirements(minimumRequirements);
    }
  
    const recommendedMatch = input.match(recommendedRegex);
    if (recommendedMatch) {
      const recommendedRequirements = recommendedMatch[1].trim();
      console.log(recommendedRequirements);
      requirements.recommended = extractSystemRequirements(recommendedRequirements);
    }
  
    return requirements;
}

/**
 * 입력된 문자열에서 시스템 요구사항을 추출하는 함수입니다.
 * 문자열을 기준으로 각 요구사항을 `OS`, `Processor`, `Memory`, `Graphics`, `DirectX`, `Storage`로 분리합니다.
 * 빈 요구사항은 빈 문자열 또는 빈 배열로 표시됩니다.
 *
 * @param {string} input - 추출할 시스템 요구사항이 포함된 문자열
 * @returns {object} - 추출된 시스템 요구사항 객체
 */
function extractSystemRequirements(input) {
    const requirements = {};

    const osMatch = input.match(/OS:\s(.*?)Processor:/);
    requirements.OS = osMatch ? osMatch[1].trim() : '';

    const processorMatch = input.match(/Processor:\s(.*?)Memory:/);
    requirements.Processor = processorMatch ? processorMatch[1].trim() : '';

    const memoryMatch = input.match(/Memory:\s(.*?)Graphics:/);
    requirements.Memory = memoryMatch ? memoryMatch[1].trim() : '';

    const graphicsMatch = input.match(/Graphics:\s(.*?)DirectX:/);
    requirements.Graphics = graphicsMatch ? graphicsMatch[1].trim() : '';

    const directXMatch = input.match(/DirectX:\s(.*?)Storage:/);
    requirements.DirectX = directXMatch ? directXMatch[1].trim() : '';

    const storageMatch = input.match(/Storage:\s(.*?)$/);
    requirements.Storage = storageMatch ? storageMatch[1].trim() : '';

    return requirements;
}

module.exports = {
    updateGameData,
    writeGameDataContinue,
    omissionCheck,
    oneAppCheck
}