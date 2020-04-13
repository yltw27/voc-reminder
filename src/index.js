require('dotenv').config()
const linebot = require('linebot');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./src/db/postgre');

// Postgre Config
const Pool = require('pg').Pool;

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: true
  // user: process.env.POSTGRE_USER,
  // host: process.env.POSTGRE_HOST,
  // database: process.env.POSTGRE_DB,
  // password: process.env.POSTGRE_PASSWORD,
  // port: process.env.POSTGRE_PORT,
})


const bot = linebot({
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
});

bot.on('message', async function(event) {
  let msg = `Hello! ${linebot.getUserProfile(event.source.userId)} 已將 ${event.message.text} 存到資料庫\n`;
  
  try {
    const client = await pool.connect();

    await client.query(`INSERT INTO voc (voc, user_id) VALUES (${event.message.text}, ${linebot.getUserProfile(event.source.userId)})`);    

    const result = await client.query('SELECT * FROM voc');
    // const results = { 'results': (result) ? result.rows : null};
    // res.render('pages/db', results );
    msg += result? result.rows: null;
    client.release();

    event.reply(msg);
    console.log(msg);
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