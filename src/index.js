// 引用 line bot SDK
const linebot = require('linebot');
const express = require('express');

// 初始化 line bot 需要的資訊，在 Heroku 上的設定的 Config Vars，可參考 Step2
const bot = linebot({
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

// 當有人傳送訊息給 Bot 時
// bot.on('message', function (event) {
//   console.log(event.message.text);
//   // 回覆訊息給使用者 (一問一答所以是回覆不是推送)
//   event.reply(`${profile.displayName} 說了 ${event.message.text}`);
// });

bot.on('message', function(event) {
  if (event.message.type = 'text') {
      let msg = event.message.text;
      //收到文字訊息時，直接把收到的訊息傳回去，這裏是 echo，就是你問什麼就回答什麼，簡單的對話
      event.reply(msg).then(function(data) {
          // 傳送訊息成功時，可在此寫程式碼
          console.log(msg);
      }).catch(function(error) {
          // 傳送訊息失敗時，可在此寫程式碼
          console.log('錯誤產生，錯誤碼：'+error);
      });
  }
});

const app = express();

// bot.parser() 是 LINE Bot 的傳過來的資料，以及 JSON 解析
const linebotParser = bot.parser();
app.post('/webhook', linebotParser);

const server = app.listen(process.env.PORT || 3000, function() {
  let port = server.address().port;
  console.log('目前的port是', port);
});

// // Bot 所監聽的 webhook 路徑與 port，heroku 會動態存取 port 所以不能用固定的 port，沒有的話用預設的 port 5000
// bot.listen('/', process.env.PORT || 5000, function () {
//   console.log('全國首家LINE線上機器人上線啦！！');
// });