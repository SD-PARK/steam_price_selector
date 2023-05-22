const useJSON = require('../apps/useJSON');
let cpuDict, gpuDict, gameData;

loadData().catch(error => {
    console.error('Failed to load data:', error);
});

const apiController = {
    getGames: async (req, res) =>  {
        res.send('good');
    },

    postGames: async (req, res) => {
        const { factor = '', display = 10, recommended, specs } = req.body;
        console.log(`factor: ${factor}\ndisplay: ${display}\nspecs:`, specs ?? 0);
    
        const inputCPU = cpuDict.get(specs?.processor);
        const inputGPU = gpuDict.get(specs?.graphics);
        // 남은 과제, supported_languages, categories, genres
        const gameList = []
        for (const game of gameData) {
            // display
            if (gameList.length === display) break;
            // recommended
            let requirements = game?.requirements?.minimum;
            if (recommended) requirements = game?.requirements?.recommended;
            if (!requirements) continue;
            // factor
            if (!game.name.includes(factor)) continue;
            // OS
            if (specs?.OS && !compareOSVersions(specs.OS, requirements?.OS)) continue;
            // Memory
            const memory = !specs.memory || (specs.memory >= (requirements?.Memory ?? 0));
            if (!memory) continue;
            // Storage
            const storage = !specs.storage || (specs.storage >= (requirements?.Storage ?? 0));
            if (!storage) continue;
            // GPU
            const gpu = !inputGPU || (inputGPU.value >= (requirements?.Graphics?.value ?? 0));
            if (!gpu) continue;
            // CPU
            const cpu = !inputCPU || (inputCPU.value >= (requirements?.Processor?.value ?? 0));
            if (!cpu) continue;
    
            gameList.push(game);
        }
    
        console.log(gameList);
        res.send('good');
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

module.exports = apiController;