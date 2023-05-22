# steam_spec_check
PC 스펙(OS, CPU, GPU 등)을 입력받아 각 권장 사양, 최소 사양을 만족시키는 Steam 게임을 검색하는 API 서버

## 🎉 프로젝트 소개
세계 최대 규모의 전자 소프트웨어 유통망인 **Steam**에는 약 5만 개가 넘는 게임들이 있습니다.

Steam 내에는 이 수많은 게임들 중 취향에 맞는 게임을 검색하기 위한 필터가 존재하지만,
**시스템 요구 사항을 기준으로 한 필터링**은 없습니다.

이제는 부담스러운 GPU 가격과 꾸준히 올라가는 그래픽 요구사양으로 인해
**최신 게임들의 권장사양을 만족시키기가 더더욱 어려워졌습니다**.

이에 시스템 사양을 기준으로 한 필터링의 필요성을 느끼게 되어 해당 프로젝트를 기획하게 되었습니다.

**본 프로젝트는 사용자의 PC 스펙(OS, CPU, GPU 등)을 입력받아
각 권장 사양, 최소 사양을 만족시키는 게임을 검색하는 API 서버를 구축합니다.**

## 👀 프로젝트 정보
### 개발 스택
<img alt="Html" src ="https://img.shields.io/badge/NODEJS-339933.svg?&style=for-the-badge&logo=Node.js&logoColor=white"/> <img alt="Html" src ="https://img.shields.io/badge/EXPRESS-000000.svg?&style=for-the-badge&logo=Express&logoColor=white"/>

## 🎫 API 레퍼런스
### 설명
시스템 요구사항을 충족하는 Steam 게임 목록을 반환합니다.

### 요청 URL
```...```

### 프로토콜
HTTPS

### HTTP 메서드
POST

### 파라미터
파라미터|타입|필수 여부|설명
:-----:|:--:|:------:|:---
factor|String|Y|검색어
display|Integer|N|한 번에 가져올 검색 결과 개수 (기본 값: -1, 음수는 모든 결과를 가져옵니다.)
recommended|Boolean|N|권장 사양 기준 필터링 여부 (기본 값: false)
▼ specs|Object|N|검색 기준이 될 사용자의 시스템 사양
|||
os|String|N|사용자의 OS 버전 (버전만 기입. 예) 'xp', '10')
processor|String|N|사용자의 CPU ([Passmark 사이트 내 CPU Name 참고](https://www.cpubenchmark.net/cpu_list.php))
memory|Integer|N|사용자의 RAM 용량 (단위: MB)
graphics|String|N|사용자의 GPU ([Passmark 사이트 내 Videocard Name 참고](https://www.videocardbenchmark.net/gpu_list.php))
storage|Integer|N|사용자의 남은 저장공간 (단위: MB)

#### 코드 예제
```json
{
    "factor": "s",
    "display": 10,
    "recommended": true,
    "specs": {
        "os": "10",
        "processor": "Intel Core i9-10850K @ 3.60GHz",
        "memory": 4096,
        "graphics": "GeForce RTX 4090",
        "storage": 204800
    }
}
```

### 응답
응답에 성공하면 결괏값을 JSON 형태로 반환합니다.
속성|타입|필수 여부|설명
:---|:--:|:------:|---:

## ✨ 주요 코드
#### src/apps/benchmarkCrawler.js
```js
async function updateData(url, fileName) {
    try {
        const html = await axios.get(url);
        const ulList = [];

        const $ = cheerio.load(html.data);

        const bodyList = $('tbody > tr');
        bodyList.each((i, element) => {
            const valueText = $(element).find('td:nth-child(2)').text();
            const value = parseInt(valueText.replace(/,/g, ''));
            ulList.push({
                name: $(element).find('td:nth-child(1) > a').text(),
                value: value
            });
        });

        await useJSON.writeJSON(ulList, fileName);
    } catch {
        console.error(error);
    }
}

module.exports = {
    async cpuUpdate() {
        await updateData('https://www.cpubenchmark.net/cpu_list.php', 'cpuData.json');
    },
    async gpuUpdate() {
        await updateData('https://www.videocardbenchmark.net/gpu_list.php', 'gpuData.json');
    }
}
```
벤치마크 점수 데이터를 제공하는 PassMark 사이트에서 모든 하드웨어의 이름과 벤치마크 점수를 **크롤링**해 **JSON 형태로 저장**합니다.

해당 데이터는 추후 **사용자 PC 성능와 각 게임별 요구 성능 간의 비교**를 위해 사용합니다.

---
#### src/apps/gameDetailsFetcher.js
```js
const batchSize = 200; // 한 번에 처리할 게임 개수
const interval = (5 * 60 * 1000) + 1000; // API 호출 간격 (밀리초 단위)
let appIDs = []; // 모든 게임의 app ID
let appNames = []; // 모든 게임의 이름
let appInfos = []; // 새로 저장할 게임의 시스템 요구사항

/**
 * 게임 데이터 작성 작업을 이어서 진행합니다. 'findOmission()' 함수를 통해 아직 작성되지 않은 데이터를 추출하고,
 * 작성된 게임 데이터 파일이 저장되어 있는 JSON 파일을 불러옵니다.
 * 이후 아직 작성되지 않은 게임들의 정보를 API를 통해 가져와 JSON 파일에 추가합니다.
 */
const continueWritingGameData = async () => {
    // 아직 작성되지 않은 게임 리스트를 불러옵니다.
    const games = await findOmission();
    appIDs = games.map(game => game.appid);
    appNames = games.map(game => game.name);
    // 작성된 게임 세부 정보가 담겨있는 데이터를 불러옵니다.
    appInfos = await useJSON.readJSON('gameData.json');
    
    // 'processNextBatch()' 함수를 통해 작성되지 않은 게임들의 세부 정보를 추출합니다.
    if (appIDs.length > 0) {
        console.log('Continue indexing from', appIDs[0]);
        await processNextBatch(0).then(async () => { await useJSON.writeJSON(appInfos, 'gameData.json'); });
    } else {
        console.log('GameData Upload Completed!');
    }
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
    
    // 다음 호출을 예약합니다. 호출을 마치면 JSON 파일에 저장합니다.
    if (endIndex < appIDs.length) {
        setTimeout(() => processNextBatch(endIndex).then(async () => {
            await useJSON.writeJSON(appInfos, 'gameData.json');
        }), interval);
    }

    // 'fetchGameDetails()' 함수를 통해 API를 호출해 게임 세부 정보를 불러와 appInfos 변수에 저장합니다.
    const promises = batchIDs.map(id => fetchGameDetails(id))
    return Promise.all(promises);
};
```
'steamapi' 모듈을 통해 **Steam 내 게임들의 세부 데이터**를 받아옵니다.

전체 게임 리스트는 한번에 요청할 수 있지만, 게임 세부 데이터(시스템 요구 사항, 카테고리 등)는 **5분에 200번**으로 API 호출에 제한이 있기 때문에, 미리 전체 게임 리스트를 JSON 형태로 저장해둔 뒤, 해당 데이터를 바탕으로 **200개 씩 나누어** 게임의 세부 데이터를 호출합니다.

<!-- 위 코드에서 API 호출 시 '**for...of**'를 사용했는데, 여러 API를 호출하기 위해 '**Promise.all**'을 사용할 수도 있지만

'Promise.all'과 'map' 함수를 사용해 배열을 순회하면 각 요소는 비동기적으로 처리할 수 있어도 **내부적으로는 병렬적으로 처리**되어 appInfos 배열에 push 되는 순서를 보장할 수 없게 됩니다.

따라서 전체 게임 리스트(game.json)와 세부 데이터(gameData.json)의 **배열 순서를 보장**하기 위해 'for...of'를 사용해 API를 호출했습니다. -->

---
