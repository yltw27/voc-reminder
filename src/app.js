// const result = require('dotenv').config();
// if (result.error) throw result.error

const linebot = require('linebot');
const Express = require('express');
const BodyParser = require('body-parser');

// Line Channel info
const bot = linebot({
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

const linebotParser = bot.parser();
const app = Express();

const port = process.env.PORT;

// for line webhook usage
app.post('/webhook', linebotParser);

app.use(BodyParser.urlencoded({ extended: true }));
app.use(BodyParser.json());

// a http endpoint for trigger broadcast
app.post('/broadcast', (req, res) => {
  bot.broadcast(req.body.message).then(() => {
    res.send('broadcast ok');
  }).catch(function (error) {
    res.send('broadcast fail');
  });
});

app.listen(port, () => {
  console.log('Server is up! Port: '+port);
});

// echo user message
bot.on('message', function (event) {
  // get user message from `event.message.text`
  // reply same message
  var replyMsg = `你剛剛說 ${event.message.text} 對吧? 我有聽錯嗎?`;
  event.reply(replyMsg).then(function (data) {
    console.log('ok')
  }).catch(function (error) {
    console.error(error)
  });
});
