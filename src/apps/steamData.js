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
        
        if (page.url() !== 'https://store.steampowered.com/' && page.url() !== 'https://store.steampowered.com/app/1418100') {
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
                appInfo.is_discount = false;
                appInfo.price = {
                    original_price: parseInt(matchedPrice.replace(/,/g, ""))
                }
            }
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
        appInfo.name = appNames[appIDs.indexOf(id)];
        
        const page = await browserContext.newPage();
        try {
            await page.goto(`https://store.steampowered.com/app/${id}`);
            
            // 해당 게임의 스토어 페이지가 존재하지 않을 경우 세부 데이터 스크래핑 방지
            if (page.url() !== 'https://store.steampowered.com/' && page.url() !== 'https://store.steampowered.com/app/1418100') {
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
                    appInfo.is_discount = false;
                    appInfo.price = {
                        original_price: parseInt(matchedPrice.replace(/,/g, ""))
                    }
                }
    
                // Requirement
            }
            console.log(appInfo);
            console.log('Push Completed! app ID', id);
        } catch (error) {
            console.log(appInfo);
            console.error(`Error occurred while processing app ID ${id}: ${error}`);
        } finally {
            appInfos.push(appInfo);
            await page.close();
        }
    });

    // // 브라우저 종료
    // await browser.close()

    // 다음 호출을 예약
    if (endIndex < appIDs.length) {
        setTimeout(() => getNextBatch(endIndex).then(async () => { await useJSON.writeJSON(appInfos, 'gameData.json'); }), interval);
    }

    return Promise.all(promises);
    // const minimum = details.pc_requirements.minimum;
    // const recommended = details.pc_requirements.recommended;
    // const minimumRequirementsObject = extractData(minimum);
    // const recommendedRequirementsObject = extractData(recommended);

    //     price_overview: details.price_overview,
    //     categories: details.categories,
    //     genres: details.genres
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
    omissionCheck,
    oneAppCheck
}