const linebot = require('linebot');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db/postgres');

const bot = linebot({
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  verify: false
});

bot.on('message', function(event) {
  console.log('Get message from user: '+event.message.text);
  // Update this code block to swith case
  if (event.message.text.trim().toLowerCase() === 'show') {
    db.query(`SELECT word, annotation, familarity FROM voc WHERE user_id = '${event.source.userId}'`, (err, res) => {
      if (err) {
        console.log(err);
        return event.reply('很抱歉, 後台出了一點問題。我們將盡快修復。');
      }
      if (res.rows.length === 0) {
        event.reply('你的單字本裡沒有單字欸');
      } else {
        let replyMsg = '';
        for (let i in res.rows) {
          replyMsg += `${res.rows[i].word}\t(${res.rows[i].annotation}, ${res.rows[i].familarity})\n`;
        }
        event.reply(replyMsg);
      }
    });
  } else if (event.message.text.includes('//')) {
    const word = event.message.text.split('//')[1].trim();
    db.query(`DELETE FROM voc WHERE user_id = '${event.source.userId}' AND word = '${word}'`, (err, res) => {
      if (err) {
        console.log(err);
        return event.reply('很抱歉, 後台出了一點問題。我們將盡快修復。');
      }
      console.log(res.rows);
      if (res.rows.length === 0) {
        event.reply(`${word} 不在你的單字本裡面啦`);
      } else {
        event.reply(`已將 ${word} 從你的單字本移除`);
      }
    });
  } else {
    const pair = event.message.text.split('/');
    const msg = `已將 ${pair[0]} (${pair[1]}) 存到資料庫`;
    db.query(`INSERT INTO voc (user_id, word, annotation) VALUES ('${event.source.userId}', '${pair[0]}', '${pair[1]}')`, (err, res) => {
      if (err) {
        console.log(err);
        return event.reply('很抱歉, 後台出了一點問題。我們將盡快修復。');
      }
      event.reply(msg);
      console.log(msg);
    });
  }
});

const app = express();
const port = process.env.PORT;

app.use(bodyParser.json());
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

const linebotParser = bot.parser();

app.post('/webhook', linebotParser);

app.listen(port, function() {
  console.log('Server is up! Listening on port: ', port);
});