
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

const replyErrorMsg = function (err, event) {
  event.reply('很抱歉，後台出了一點問題。我們將盡快修復。');
  console.log(err);
};

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
    // Check if daily created words > 15
    let num = await query(`SELECT count(1) 
                           FROM voc
                           WHERE user_id = '${userId}'
                           AND created_at > now() - interval '1 day';`);
    num = parseInt(num.rows[0].count);
    if (num >= 15) {
      return event.reply(`你已經新增${num}個單字囉! 每24小時只能新增15個單字`);
    }

    await query(`INSERT INTO voc (user_id, word, annotation) 
                 VALUES ('${userId}', '${word}', '${annotation}') 
                 ON CONFLICT (user_id, word) 
                 DO UPDATE SET annotation = '${annotation}',
                               updated_at = NOW();`);
    event.reply(`已將 ${word} (${annotation}) 存到資料庫`);
  } catch (e) {
    replyErrorMsg(e, event);
  }
};

const updateWord = async function(userId, word, annotation, event) {
  try {
    // Check if the word is in user's list
    const count = await query(`SELECT word
                               FROM voc
                               WHERE user_id = '${userId}'
                               AND word = '${word}';`);
    if (count.rows.length === 0) {
      return event.reply(`${word} 不在你的單字本中喔`);
    }

    await query(`UPDATE voc
                 SET annotation = '${annotation}',
                     updated_at = NOW()
                 WHERE word = '${word}'
                 AND user_id = '${userId}';`);
    event.reply(`已將資料更新為 ${word} (${annotation})`);
  } catch (e) {
    replyErrorMsg(e, event);
  }
};

const showWords = async function (userId, event) {
  try {
    const res = await query(`SELECT word, annotation
                             FROM voc
                             WHERE user_id = '${userId}'
                             ORDER BY level ASC, updated_at ASC;`);
    if (res.rows.length === 0) {
      event.reply('你的單字本裡面沒有單字欸');
    } else {
      let msg = '';
      for (let i in res.rows) {
        msg += `${res.rows[i].word}\n${res.rows[i].annotation}\n--\n`;
      }
      event.reply(msg);
    }
  } catch (e) {
    replyErrorMsg(e, event);
  }
};

const deleteWord = async function (userId, word, event) {
  try {
    await query(`DELETE FROM voc 
                 WHERE user_id = '${userId}' 
                 AND word = '${word}';`);
    event.reply(`已將 ${word} 從你的單字本移除`);
  } catch (e) {
    replyErrorMsg(e, event);
  }
};

const reviewWords = async function (userId, event) {



  // Save user's top 25 words into a temp table
  await query(`CREATE TEMP TABLE review_${userId} AS
           SELECT voc.word, voc.annotation, voc.level
           FROM voc
           WHERE user_id = '${userId}'
           ORDER BY level ASC, updated_at ASC
           LIMIT 25;`, (err, res) => {
    console.log('create executed');
    if (err) {
      // console.log(err);
      event.reply(errMsg);
    }
  });  

  await query(`ALTER TABLE review_${userId}
               ADD COLUMN correct INT DEFAULT 0;`, (err, res) => {
    console.log('alter executed');
    if (err) {
      // console.log(err);
      event.reply(errMsg);
    }
  });

  // Show table
  await query(`SELECT * FROM review_${userId}`, (err, res) => {
    console.log('show executed');
    // console.log(err, res);
  })

  // // get user's answers and update temp table (correct and level)

  // // send score back

  // // Drop temp table
  // await query(`DROP TABLE review_${userId};`, (err, res) => {
  //   console.log('drop executed');
  //   // console.log(err, res);
  // });
};

module.exports = {
  addWord,
  updateWord,
  showWords,
  deleteWord,
  reviewWords
  // query: (queryString, callback) => {
  //   const start = Date.now();
  //   return pool.query(queryString, (err, res) => {
  //     const duration = Date.now() - start;
  //     console.log('executed query', {queryString, duration}); //, rows: res.rowCount});
  //     callback(err, res);
  //   })
  // },
};
