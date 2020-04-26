# How to build your own wordbook on LineBot

## 1. Create a LineBot developer account

There are quite a few articles talking about this topic. I refered to this one while building my LineBot:
[手把手教你建聊天機器人(linebot+nodjes+ngrok)](https://medium.com/@mengchiang000/%E6%89%8B%E6%8A%8A%E6%89%8B%E6%95%99%E4%BD%A0%E5%BB%BA%E8%81%8A%E5%A4%A9%E6%A9%9F%E5%99%A8%E4%BA%BA-linebot-nodjes-ngrok-7ad028d97a07)

## 2. Use [LineBot npm module](https://www.npmjs.com/package/linebot) to interact with Line IDs

    const express = require('express');
    const bodyParser = require('body-parser');
    const linebot = require('linebot');

    const bot = linebot({
      channelId: process.env.LINE_CHANNEL_ID,
      channelSecret: process.env.LINE_CHANNEL_SECRET,
      channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
    });

    bot.on('message', async function(event) {
      const userName = await bot.getUserProfile(event.source.userId).displayName;
      if (event.message.type === 'text') {
        event.reply(`Hello ${userName}! Did you just say '${event.message.text}' ?`);
      } else {
        event.reply({
          type: 'sticker',
          packageId: 11537,
          stickerId: 52002734
        });
      }
    });

    const app = express();
    const linebotParser = bot.parser();

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({extended: true}));

    app.post('/webhook', linebotParser);

    const port = process.env.PORT;

    app.listen(port, function() {
      console.log('Server is up! Port: ', port);
    });

### Test your changes without deploying on Heroku

1. Install and start [ngrok](https://ngrok.com/)

       ngrok http PORT

2. Paste the ngrok forwarding HTTPS URL as your Webhook URL on Messaging API. Don't forget to add **/webhook** in the end.

3. Start your app

       node src/index.js

4. Now you are able to talk to your LineBot on Line!

## 3. Save words and annotations in [Postgres](https://node-postgres.com/) database

Please refer to [this article](https://devcenter.heroku.com/articles/getting-started-with-nodejs#provision-a-database) to add Postgres database to your app and install needed npm module, then you can use the Postgres URL as DATABASE_URL.

    const {Pool} = require('pg');

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: true
    });

    const query = function(queryString) {
      return new Promise((resolve, reject) => {
        const start = Date.now();
        try {
          const res = pool.query(queryString);
          const duration = Date.now() - start;
          console.log('executed query', {queryString, duration});
          resolve(res);
        } catch (e) {
          reject(e);
        }
      });
    };

    const addWord = async function (userId, word, annotation, event) {
      try {
          await query(`INSERT INTO voc (user_id, word, annotation) 
                       VALUES ('${userId}', '${word}', '${annotation}') 
                       ON CONFLICT (user_id, word) 
                       DO UPDATE SET annotation = '${annotation}', updated_at = NOW();`);
          event.reply(`${word} (${annotation}) is saved.`);
          query(`UPDATE status SET total = total + 1 WHERE user_id = '${userId}';`);
      } catch (e) {
        console.log(e);
      }
    };

### Use Redis cache

Heroku will need you to fill in your credit card information though using Heroku Redis could be free.
It's unnecessary to do it unless you feel the response is too slow.

    // REDIS_URL is the port of your local Redis server
    const redisClient = require('redis').createClient(process.env.REDIS_URL);

    const checkUserStatus = async function (userId, event, callback) {
      redisClient.get(userId+'_mode', async (err, res) => {
        if (err) {
          console.log(err);
        }

        if (res === null) {
          redisClient.setex(userId+'_mode', 3600, 'normal');
        }

        // ...

        callback(true);
      });
    };

## 4. Deploy on Heroku
