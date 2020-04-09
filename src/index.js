// const app = require('./app');
const bot = require('./linebot');

const port = process.env.PORT;
// const linebotPort = process.env.LINEBOT_PORT;

// app.listen(port, () => {
//     console.log('Server is up! Listening on port '+port);
// });

bot.listen('/linewebhook', port, function () {
    console.log('[BOT已準備就緒]');
});