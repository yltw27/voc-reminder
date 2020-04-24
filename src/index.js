const linebot = require('linebot');
const express = require('express');
const bodyParser = require('body-parser');

// use postgres-cache for local env
let db;
if (process.env.ENV === 'local') {
  db = require('./db/postgres-cache');
  console.log('Use Redis cache!');
} else {
  db = require('./db/postgres');
  console.log('Not use Redis cache!');
}

const port = process.env.PORT;

const bot = linebot({
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  verify: false
});

bot.on('follow', function(event) {
  db.updateUserStatus(event.source.userId, 'normal', event);
});

bot.on('unfollow', function(event) {
  db.updateUserStatus(event.source.userId, 'block', event);
});

const stickers = [52002734, 52002735, 52002736, 52002738, 52002739,
                  52002741, 52002748, 52002752, 52002768];

bot.on('message', async function(event) {
  // If user sends something other than text, reply a random sticker
  if (event.message.type !== 'text') {
    return event.reply({
      type: 'sticker',
      packageId: 11537,
      stickerId: stickers[Math.floor(Math.random()*9)]
    });
  }

  const userMsg = event.message.text;
  const cleanUserMsg = userMsg.toLowerCase().trim();
  const userId = event.source.userId;

  if (cleanUserMsg === 'help') {
    return event.reply(`[Commands]\nAdd a new word:\n+ word/definition\n\nUpdate a word:\nword/new definition\n\nDelete a word:\n//word\n\nStart review mode:\nreview\n\nEnd review mode:\n#end\n\nShow all words:\nshow\n\n- You can choose any language for words and definitions.\n- Happy Learning!`);
  }

  // Check if the user is in 'review' mode
  await db.isReviewMode(userId, cleanUserMsg, event, (reviewing) => {
    if (reviewing === false) {
      if (cleanUserMsg === '#end') {
        event.reply('You are not in review mode.');
      } else if (cleanUserMsg === 'review') {
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
    }
  });
});

async function reminder() {
  try {
    const users = await db.getUsers();
    for (user of users) {
      const profile = await bot.getUserProfile(user.user_id);
      bot.push(user.user_id, `Hey ${profile.displayName}~ Let's review words together \uDBC0\uDC8F`);
    }
  } catch (e) {
    console.log(e);
  }
};

function dailyReminder() {
  reminder();
  setTimeout(function() {
    dailyReminder();
  }, 60 * 60 * 24);
};

const app = express();

// body parser middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));

const linebotParser = bot.parser();

app.post('/webhook', linebotParser);

app.listen(port, function() {
  console.log('Server is up! Listening on port: ', port);
  dailyReminder();
});