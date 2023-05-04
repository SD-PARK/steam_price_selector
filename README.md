# steam_spec_check
하드웨어 사양을 통해 권장, 최소 사양을 만족하는 스팀 게임을 검색하는 API

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
- ### 개발 스택
<img alt="Html" src ="https://img.shields.io/badge/NODEJS-339933.svg?&style=for-the-badge&logo=Node.js&logoColor=white"/> <img alt="Html" src ="https://img.shields.io/badge/EXPRESS-000000.svg?&style=for-the-badge&logo=Express&logoColor=white"/>

## ✨ 주요 코드
#### src/apps/gpuUpdate.js
```js
try {
    const html = await axios.get('https://www.videocardbenchmark.net/gpu_list.php');
    let ulList = [];

    const $ = cheerio.load(html.data);

    const bodyList = $('tbody > tr');
    bodyList.map((i, element) => {
        ulList[i] = {
            name: $(element).find('td:nth-child(1) > a').text(),
            value: $(element).find('td:nth-child(2)').text()
        }
    });
    useJSON.writeJSON(ulList, 'gpu.json');
} catch {
    console.error(error);
}
```
벤치마크 점수 데이터를 제공하는 PassMark 사이트에서 모든 GPU의 이름과 벤치마크 점수를 **크롤링** 해 **JSON 형태로 저장**합니다.

해당 데이터는 추후 사용자 GPU와 각 게임별 요구 GPU 성능 간의 비교를 위해 사용합니다.
