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
```http://ec2-13-209-21-60.ap-northeast-2.compute.amazonaws.com:4000/games```

### 프로토콜
HTTPS

### HTTP 메서드
POST

### 파라미터
<img src="https://github.com/SD-PARK/steam_spec_check/assets/97375357/abade43f-4af2-4ea7-b205-4e3370dc2861" valign="bottom"/>
<details>
<summary><img src="https://github.com/SD-PARK/steam_spec_check/assets/97375357/7f8c2bcb-82df-4e1d-b03b-bbdb26a45757" valign="bottom"></summary>
<div markdown="1">
<img src="https://github.com/SD-PARK/steam_spec_check/assets/97375357/f05954ee-4aa9-4d1b-b3cb-7c74b44be5b3" valign="bottom"/>
</div></details>

### 참고 사항
일부 파라미터에서 사용하는 코드 값은 다음과 같습니다.

<details><summary>언어 목록</summary>
<div markdown="1">
<img src="https://github.com/SD-PARK/steam_spec_check/assets/97375357/5474221d-f489-4c63-8220-0ca1e1f88d84">
</div></details>

<details><summary>카테고리 목록</summary>
<div markdown="1">
<img src="https://github.com/SD-PARK/steam_spec_check/assets/97375357/4a295468-bc8f-4eb8-813e-925a0c864109">
</div></details>

<details><summary>장르 목록</summary>
<div markdown="1">
<img src="https://github.com/SD-PARK/steam_spec_check/assets/97375357/d13d198a-fc98-4d9f-85d1-4cd2227bf004">
</div></details>

[CPU 목록](https://www.cpubenchmark.net/cpu_list.php)

[GPU 목록](https://www.videocardbenchmark.net/gpu_list.php)

### 코드 예제
```json
{
    "factor": "magicka",
    "display": 1,
    "recommended": true,
    "languages": ["English"],
    "categories": [2, 28],
    "genres": [1],
    "specs": {
        "os": "10",
        "processor": "Intel Core i9-10850K @ 3.60GHz",
        "memory": 8192,
        "graphics": "GeForce RTX 4090",
        "storage": 204800
    }
}
```

### 응답
응답에 성공하면 결괏값을 JSON 형태로 반환합니다.

![response](https://github.com/SD-PARK/steam_spec_check/assets/97375357/1781d1e8-324c-4f4e-8e5e-4073ab2ae12f)

<details><summary><h3>응답 예</h3></summary>
<div markdown="1">

``` json
[
    {
        "name": "Magicka 2: Ice, Death and Fury",
        "id": 414651,
        "is_free": false,
        "supported_languages": ["English", "French", "Italian", "German", "Spanish - Spain", "Polish", "Portuguese - Brazil", "Russian"],
        "header_image": "https://cdn.akamai.steamstatic.com/steam/apps/414651/header.jpg?t=1589892038",
        "requirements": {
            "minimum": {
                "OS": {"version": "7", "bit": "64"},
                "Memory": 2048,
                "Graphics": {"name": "Radeon HD 5850", "value": 1978},
                "Storage": 3072
            },
            "recommended": {
                "OS": {"version": "", "bit": "64"},
                "Memory": 4096,
                "Graphics": {"name": "Radeon HD 6670", "value": 734},
                "Storage": 7168
            }
        },
        "categories": [
            {"id": 2, "description": "Single-player"}, 
            {"id": 1, "description": "Multi-player"}, 
            {"id": 9, "description": "Co-op"}, 
            {"id": 24, "description": "Shared/Split Screen"}, 
            {"id": 21, "description": "Downloadable Content"}, 
            {"id": 22, "description": "Steam Achievements"}, 
            {"id": 28, "description": "Full controller support"}, 
            {"id": 29, "description": "Steam Trading Cards"}
        ],
        "genres": [{"id": 1, "description": "Action"}, {"id": 25, "description": "Adventure"}]
    }
]
```
</div></details>

## ✨ 주요 코드
<details><summary><h4>src/apps/benchmarkCrawler.js</h4></summary>
<div markdown="1">

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
</div></details>

벤치마크 점수 데이터를 제공하는 PassMark 사이트에서 모든 하드웨어의 이름과 벤치마크 점수를 **크롤링**해 **JSON 형태로 저장**합니다.

해당 데이터는 추후 **사용자 PC 성능와 각 게임별 요구 성능 간의 비교**를 위해 사용합니다.

---
<details><summary><h4>src/apps/gameDetailsFetcher.js</h4></summary>
<div markdown="1">

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
    const promises = batchIDs.map(id => fetchGameDetails(id));
    return Promise.all(promises);
}
```
    
</div></details>
    
'steamapi' 모듈을 통해 **Steam 내 게임들의 세부 데이터**를 받아옵니다.

전체 게임 리스트는 한 번에 요청할 수 있지만,

게임 세부 데이터(시스템 요구 사항, 카테고리 등)는 **5분에 200번**으로 API 호출에 제한이 있기 때문에

미리 전체 게임 리스트를 JSON 형태로 저장해둔 뒤, 해당 데이터를 바탕으로 **200개 씩 나누어** 게임의 세부 데이터를 호출합니다.

---
<details><summary><h4>src/routes/_controller/apiController.js</h4></summary>
<div markdown="1">

```js
const apiController = {
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
```
</div></details>

**요청 본문**에 대한 **유효성 검사**를 진행하는 미들웨어입니다.

입력받은 값이 유효하지 않을 경우, **오류 응답을 반환**합니다.

오류 응답은 JSON 형식으로 `{ error: '오류 메시지' }`와 같이 구성되며, 상태 코드 400으로 설정됩니다.

유효성 검사 항목을 충족하는 경우, 'next()' 함수를 호출하여 **다음 미들웨어로 이동**합니다.

---

## 💬 실행 방법

### Requirements
For building and running the applicationyou need:
- Node.js (v16 or above)
- npm (Node Package Manager)

### Installation

1. Clone the repository:
```bash
$ git clone https://github.com/SD-PARK/steam_spec_check.git
```

2. Navigate to the project directory:
```bash
$ cd steam_spec_check
```

3. Install the dependencies:
```bash
$ npm install
```

### Configuration
To run this project successfully, you need to add the STEAM_API_KEY to the .env file. The STEAM_API_KEY is obtained from the Steam website. Here's how you can add the Steam API Key to the .env file:

1. Sign up and log in to the Steam Developer site.

2. To obtain the Steam API Key, follow these steps:
   - Go to the developer page (https://steamcommunity.com/dev/apikey).
   - Click on "Register a New Web API Key".
   - Enter an application name, agree to the terms, and click on "Register".
   - A Steam API Key will be generated. Save this key in a secure location.

3. Create a `.env` file in the project root directory.

4. Open the `.env` file in a text editor and write the following:

   ```plaintext
   STEAM_API_KEY=Enter_Your_Steam_API_Key_Here
    ```

    Replace Enter_Your_Steam_API_Key_Here with the actual Steam API Key you obtained.

    Save the .env file.

    Now, when you run the API server, the .env file will be automatically loaded, and you can access the Steam API Key using process.env.STEAM_API_KEY.

### Usage
To start the API Server, run the following command:
```bash
$ npm start
```
The server will start listening on the specified port (default: 4000) and you will see the message `Server listen on PORT ${PORT}` in the console.

### API Endpoints
GET `/update`: Update the list of new games on Steam.
    
POST `/games`: Submits user PC specifications and retrieves a list of compatible games.

Please refer to the [API documentation](#파라미터) for more details on each endpoint and the expected request and response formats.
