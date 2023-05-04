const express = require('express');
const app = express();
const server = require('http').createServer(app);
const config = require('./config/config');

const PORT = config.PORT;

// 외부 도메인 접근 관련
// const cors = require('cors');
// let corsOptions = {
//     origin: '*',
//     credential: true
// }
// app.use(cors(corsOptions));

const router = require('./routes/testAPI');
app.use('/', router);

const gpu = require('./src/apps/gpuUpdate');
server.listen(PORT, () => { console.log('Server listen on PORT', PORT); });