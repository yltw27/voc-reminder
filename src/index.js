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

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: true
//   // user: process.env.POSTGRE_USER,
//   // host: process.env.POSTGRE_HOST,
//   // database: process.env.POSTGRE_DB,
//   // password: process.env.POSTGRE_PASSWORD,
//   // port: process.env.POSTGRE_PORT,
// })

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

    client.connect();
    client.query(`INSERT INTO voc (voc, user_id) VALUES ('${event.message.text}', 100);`, (err, res) => {
      if (err) {
        console.log(err);
      }
      for (let row of res.rows) {
        console.log(JSON.stringify(row));
      }
      client.end();
    });

    // const client = await pool.connect();
    // await client.query(`INSERT INTO voc (voc, user_id) VALUES ('${event.message.text}', 100)`);
    // const result = await client.query('SELECT * FROM voc');
    // console.log(result);
    // client.release();

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

app.listen(port, function() {
  console.log('Server is up! Listening on port: ', port);
});