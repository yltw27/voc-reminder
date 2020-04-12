const linebot = require('linebot');
const express = require('express');

const bot = linebot({
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

bot.on('message', function(event) {
  let msg = event.message.text;
  try {
    event.reply(`Hello 你剛剛說了 ${msg}`);
    console.log(msg);
  } catch (e) {
    console.log('Error: '+e);
  }
});

const app = express();

// bot.parser() 是 LINE Bot 的傳過來的資料，以及 JSON 解析
const linebotParser = bot.parser();
app.post('/webhook', linebotParser);

const port = process.env.PORT;

app.listen(port, function() {
  console.log('Server is up! Listening on port: ', port);
});