const linebot = require('linebot');
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db/postgres');

const errMsg = '很抱歉，後台出了一點問題。我們將盡快修復。';

const bot = linebot({
  channelId: process.env.LINE_CHANNEL_ID,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  verify: false
});

bot.on('message', function(event) {
  const userMsg = event.message.text.trim();
  const userId = event.source.userId;
  console.log('Get message from user: '+userMsg);

  // Check if the status of userId is test 
  db.query(`SELECT status FROM status WHERE user_id = '${userId}'`, (err, res) => {
    if (err) {
      console.log(err);
      return event.reply();
    }
    if (res.rows.length === 0 || res.rows[0].status !== 'test') {
      // Show words
      if (userMsg.toLowerCase() === 'show') {
        db.query(`SELECT word, annotation, familarity 
                  FROM voc 
                  WHERE user_id = '${userId}'`, (err, res) => {
          if (err) {
            console.log(err);
            return event.reply(errMsg);
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
      // Set status to test
      } else if (userMsg.toLowerCase() === 'test') {
        db.query(`INSERT INTO status (user_id, status) 
                  VALUES ('${userId}', 'test') 
                  ON CONFLICT (user_id) 
                  DO UPDATE SET status = 'test'`, (err, res) => {
          if (err) {
            console.log(err);
            return event.reply(errMsg);
          }
          event.reply('開始測試');
        });
    
        // Create a temporary table for user's test
        db.query(`CREATE TABLE test_${userId} AS
                    SELECT word, annotation
                    FROM voc
                    WHERE user_id = '${userId}'),
                    score INT DEFAULT 0
                  );`, (err, res) => {
          if (err) {
            // Should set status from test to null and delete temp table
            db.query(`DROP TABLE test_${userId}`);
            console.log(err);
            return event.reply(errMsg);
          }

          // Add columns: tested, score
          db.query(`ALTER TABLE test_${userId}
                    ADD COLUMN tested BOOLEAN DEFAULT FALSE,
                    ADD COLUMN score INT DEFAULT 0;`, (err, res) => {
            if (err) {
              // Should set status from test to null and delete temp table
              db.query(`DROP TABLE test_${userId}`);
              console.log(err);
              return event.reply(errMsg);
            }
          });

          // add num_words
          db.query(`UPDATE status
                    SET num_words = ${res.rows.length}
                    WHERE user_id = '${userId}';`, (err, res) => {
            if (err) {
              // Should set status from test to null and delete temp table
              db.query(`DROP TABLE test_${userId}`);
              console.log(err);
              return event.reply(errMsg);
            }
          });
        });
      // Delete words
      } else if (userMsg.includes('//')) {
        const word = event.message.text.split('//')[1].trim();
        db.query(`DELETE FROM voc 
                  WHERE user_id = '${userId}' 
                  AND word = '${word}'`, (err, res) => {
          if (err) {
            console.log(err);
            return event.reply(errMsg);
          }
          event.reply(`已將 ${word} 從你的單字本移除`);
        });
      // Save or update words
      } else {
        const pair = event.message.text.split('/');
        const msg = `已將 ${pair[0]} (${pair[1]}) 存到資料庫`;
    
        db.query(`INSERT INTO voc (user_id, word, annotation) 
                  VALUES ('${userId}', '${pair[0]}', '${pair[1]}') 
                  ON CONFLICT (user_id, word) 
                  DO UPDATE SET annotation = '${pair[1]}'`, (err, res) => {
          if (err) {
            console.log(err);
            return event.reply(errMsg);
          }
          event.reply(msg);
          console.log(msg);
        });
      }
    // Testing
    } else {
      db.query(`SELECT word, annotation, score FROM test_${userId} WHERE tested = FALSE;`, (err, res) => {
        // All words are tested
        // if (res.rows.length === 0) {
        // } else {
        // }
        console.log(err, res);
      });
    }
  });
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