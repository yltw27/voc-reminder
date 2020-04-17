const linebot = require('linebot');
const express = require('express');
const bodyParser = require('body-parser');
const {addWord, updateWord, showWords, deleteWord, reviewWords} = require('./db/postgres');

const bot = linebot({
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  verify: false
});

bot.on('message', function(event) {
  const userMsg = event.message.text.trim();
  const userId = event.source.userId;

  if (userMsg.includes('//')) {
    deleteWord(userId, userMsg.split('//')[1].trim(), event);
  } else if (userMsg.toLowerCase() === 'show') {
    showWords(userId, event);
  } else if (userMsg.toLowerCase() === 'review') {
    reviewWords(userId, event);
  } else if (userMsg.includes('+')) {
    const pair = userMsg.replace('+', '').split('/');
    addWord(userId, pair[0].trim(), pair[1].trim(), event);
  } else {
    const pair = userMsg.split('/');
    console.log(pair);
    updateWord(userId, pair[0].trim(), pair[1].trim(), event);
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