const linebot = require('linebot');
const express = require('express');
const bodyParser = require('body-parser');
// const db = require('./db/postgre');

// Postgre Config
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

const saveToDb = async function(text, userId) {
  client.connect();
  try {
    await client.query(`INSERT INTO voc (voc, user_id) VALUES ('${text}', ${userId});`);
    const res = await client.query('SELECT * FROM voc;');
    for (let row of res.rows) {
      console.log(JSON.stringify(row));
    }
  } catch (e) {
    console.log(e);
  }
  client.end();
};

const bot = linebot({
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  verify: false
});

bot.on('message', async function(event) {
  // let msg = `Hello! ${bot.getUserProfile(event.source.userId)} 已將 ${event.message.text} 存到資料庫`;
  let msg = `已將 ${event.message.text} 存到資料庫`;
  
  try {
    event.reply(msg);
    // console.log(`${parseString(bot.getUserProfile(event.source.userId))}: ${event.message.text}`);
    await saveToDb(event.message.text, 99);

  } catch (e) {
    console.log(`Error: ${e}`);
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

app.get('/', (req, res) => {
  saveToDb('hello', '100');
  res.send('ok');
});

app.listen(port, function() {
  console.log('Server is up! Listening on port: ', port);
});