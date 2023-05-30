const useJSON = require('../../apps/useJSON');
let cpuDict, gpuDict, gameData;

loadData().catch(error => {
    console.error('Failed to load data:', error);
});

const apiController = {
    postGames: async (req, res) => {
        const { factor = '', display = 10, recommended, languages, categories, genres, specs } = req.body;
        
        const inputCPU = cpuDict.get(specs?.processor);
        const inputGPU = gpuDict.get(specs?.graphics);
        const gameList = []
        for (const game of gameData) {
            // display
            if (gameList.length === display) break;
            // recommended
            let requirements = game?.requirements?.minimum;
            if (recommended) requirements = game?.requirements?.recommended;
            if (!requirements) continue;
            // factor
            if (!game.name.toLowerCase().includes(factor.toLowerCase())) continue;
            // supported_languages
            if (languages) {
                if (!game.supported_languages) continue;
                if (!areAllValueIncluded(game.supported_languages, languages)) continue;
            }
            // categories
            if (categories && game.categories) {
                if (!game.categories) continue;
                if (!areAllValueIncluded(game.categories.map(category => category.id), categories)) continue;
            }
            // genres
            if (genres && game.genres) {
                if (!game.genres) continue;
                if (!areAllValueIncluded(game.genres.map(genre => genre.id), genres)) continue;
            }
            // OS
            if (specs?.OS && !compareOSVersions(specs.OS, requirements?.OS)) continue;
            // Memory
            const memory = !specs?.memory || (specs.memory >= (requirements?.Memory ?? 0));
            if (!memory) continue;
            // Storage
            const storage = !specs?.storage || (specs.storage >= (requirements?.Storage ?? 0));
            if (!storage) continue;
            // GPU
            const gpu = !inputGPU || (inputGPU.value >= (requirements?.Graphics?.value ?? 0));
            if (!gpu) continue;
            // CPU
            const cpu = !inputCPU || (inputCPU.value >= (requirements?.Processor?.value ?? 0));
            if (!cpu) continue;
    
            gameList.push(game);
        }
        res.status(200).json(gameList);
        console.log('Game search results returned successfully.');
    },

    validateInputMiddleware: (req, res, next) => {
        const { factor, display, recommended, languages, categories, genres, specs } = req.body;
        // factor
        if (factor !== undefined && typeof factor !== 'string') {
            return res.status(400).json({ error: 'Invalid factor. Factor should be a string.' });
        }
        // display
        if (display !== undefined && typeof display !== 'number') {
            return res.status(400).json({ error: 'Invalid display. Display should be a number.' });
        }
        // recommended
        if (recommended !== undefined && typeof recommended !== 'boolean') {
            return res.status(400).json({ error: 'Invalid recommended. Recommended should be a boolean.' });
        }
        // languages
        if (languages !== undefined) {
            if (!Array.isArray(languages)) {
                return res.status(400).json({ error: 'Invalid languages. Languages should be an array.' });
            }
            if (!languages.every((lang) => typeof lang === 'string')) {
                return res.status(400).json({ error: 'Invalid languages. All elements in languages array should be strings.' });
            }
        }
        // categories
        if (categories !== undefined) {
            if (!Array.isArray(categories)) {
                return res.status(400).json({ error: 'Invalid categories. Categories should be an array.' });
            }
            if (!categories.every((category) => typeof category === 'number')) {
                return res.status(400).json({ error: 'Invalid categories. All elements in categories array should be numbers.' });
            }
        }
        // genres
        if (genres !== undefined) {
            if (!Array.isArray(genres)) {
                return res.status(400).json({ error: 'Invalid genres. Genres should be an array.' });
            }
            if (!genres.every((genre) => typeof genre === 'number')) {
                return res.status(400).json({ error: 'Invalid genres. All elements in genres array should be numbers.' });
            }
        }
        // specs
        if (specs !== undefined) {
            if (typeof specs !== 'object' || specs === null) {
                return res.status(400).json({ error: 'Invalid specs. Specs should be an object.' });
            }
            // os
            const windowsVersions = ["Vista", "7", "8", "8.1", "10", "11"];
            if (specs.os !== undefined && !windowsVersions.includes(specs.os)) {
                return res.status(400).json({ error: 'Invalid os. OS should only write the version of Windows.' });
            }
            // processor
            if (specs.processor !== undefined && !cpuDict.has(specs.processor)) {
                return res.status(400).json({ error: 'Invalid processor. Processor must have a specified value. Please refer to the site: https://www.cpubenchmark.net/cpu_list.php' });
            }
            // memory
            if (specs.memory !== undefined && typeof specs.memory !== 'number') {
                return res.status(400).json({ error: 'Invalid memory. Memory should be a number.' });
            }
            // graphics
            if (specs.graphics !== undefined && !gpuDict.has(specs.graphics)) {
                return res.status(400).json({ error: 'Invalid graphics. Graphics must have a specified value. Please refer to the site: https://www.videocardbenchmark.net/gpu_list.php' });
            }
            // storage
            if (specs.storage !== undefined && typeof specs.storage !== 'number') {
                return res.status(400).json({ error: 'Invalid storage. Storage should be a number.' });
            }
        }
        
        next();
    }
}

/**
 * 데이터를 로드하는 비동기 함수입니다.
 * cpuData.json, gpuData.json, gameData.json 파일에서 데이터를 읽어와 적절한 변수에 할당합니다.
 */
async function loadData() {
    const cpuList = await useJSON.readJSON('cpuData.json');
    const gpuList = await useJSON.readJSON('gpuData.json');
    gameData = await useJSON.readJSON('gameData.json');

    cpuDict = new Map();
    for (const cpu of cpuList) {
        cpuDict.set(cpu.name, cpu);
    }
    gpuDict = new Map();
    for (const gpu of gpuList) {
        gpuDict.set(gpu.name, gpu);
    }
}

/**
 * 입력한 윈도우 버전과 게임의 요구 버전을 비교하여 호환 여부를 반환합니다.
 * 
 * @param {string} inputVersion - 입력한 윈도우 버전
 * @param {string} requiredVersion - 게임의 요구 버전
 * @returns {boolean} - 입력한 버전이 요구 버전 이상이면 true, 낮으면 false를 반환합니다.
 */
function compareOSVersions(inputVersion, requiredVersion) {
    const windowsVersions = ['Vista', '7', '8', '8.1', '10', '11'];
    const inputIndex = windowsVersions.indexOf(inputVersion);
    const requiredIndex = windowsVersions.indexOf(requiredVersion);

    return inputIndex >= requiredIndex;
}

/**
 * targetArray의 모든 값이 sourceArray에 포함되어 있는지 확인하는 함수입니다.
 * 
 * @param {Array} sourceArray
 * @param {Array} targetArray
 * @returns {boolean} - targetArray의 모든 값이 sourceArray에 포함되어 있으면 true를 반환합니다.
 */
function areAllValueIncluded(sourceArray, targetArray) {
    return targetArray.every(value => sourceArray.includes(value));
}

module.exports = apiController;