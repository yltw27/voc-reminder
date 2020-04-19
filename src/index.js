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

bot.on('message', async function(event) {
  const userMsg = event.message.text;
  const userId = event.source.userId;

  // Check if the mode is 'review'
  const review = await db.isReviewMode(userId, userMsg, event);
  if (review === true) {
    if (userMsg.toLowerCase().trim() !== '#end') {
      db.checkAnswer(userId, userMsg, event);
    } 
    return; 
  } 

  if (userMsg.trim().toLowerCase() === 'review') {
    db.startReviewMode(userId, event);
  } else if (userMsg.includes('//')) {
    db.deleteWord(userId, userMsg.split('//')[1].trim(), event);
  } else if (userMsg.trim().toLowerCase() === 'show') {
    db.showWords(userId, event);
  } else if (userMsg.trim().toLowerCase() === 'review') {
    db.startReviewMode(userId, event);
  } else if (userMsg.includes('+')) {
    const pair = userMsg.replace('+', '').split('/');
    db.addWord(userId, pair[0].trim(), pair[1].trim(), event);
  } else {
    const pair = userMsg.split('/');
    db.updateWord(userId, pair[0].trim(), pair[1].trim(), event);
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