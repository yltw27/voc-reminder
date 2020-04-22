const linebot = require('linebot');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db/postgres');

const port = process.env.PORT;

const bot = linebot({
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  verify: false
});

bot.on('follow', async function(event) {
  db.addUserStatus(event.source.userId);
});

bot.on('message', async function(event) {
  const userMsg = event.message.text;
  const cleanUserMsg = userMsg.toLowerCase().trim();
  const userId = event.source.userId;

  if (cleanUserMsg === 'help') {
    return event.reply(`[Commands]\nAdd a new word:\n+ word/definition\n\nUpdate a word:\nword/new definition\n\nDelete a word:\n//word\n\nStart review mode:\nreview\n\nEnd review mode:\n#end\n\nShow all words:\nshow\n\n- You can choose any language for words and definitions.\n- Happy Learning!`);
  }

  // Check if the user is in 'review' mode
  const review = await db.isReviewMode(userId, cleanUserMsg, event);
  if (review === true) {
    if (cleanUserMsg !== '#end') {
      db.checkAnswer(userId, userMsg, event);
    } 
    return;
  }

  if (cleanUserMsg === 'review') {
    db.startReviewMode(userId, event);
  } else if (cleanUserMsg === 'show') {
    db.showWords(userId, event);
  } else if (userMsg.includes('//')) {
    db.deleteWord(userId, userMsg.split('//')[1].trim(), event);
  } else if (userMsg.includes('+')) {
    const pair = userMsg.replace('+', '').split('/');
    db.addWord(userId, pair[0].trim(), pair[1].trim(), event);
  } else {
    const pair = userMsg.split('/');
    db.updateWord(userId, pair[0].trim(), pair[1].trim(), event);
  }
});

const app = express();

// body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const linebotParser = bot.parser();

app.post('/webhook', linebotParser);

app.listen(port, function() {
  console.log('Server is up! Listening on port: ', port);
});