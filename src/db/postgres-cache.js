const {Pool} = require('pg');
// const cache = require('./cache');

const redisClient = require('redis').createClient(process.env.REDIS_URL);
const expire = 60 * 60 * 12;
const reviewExpire = 3600; // keep review data up to 1 hr

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

const replyErrorMsg = function (err, event) {
  event.reply('Sorry.. Something\'s going wrong. We are trying to fix this problem \uDBC0\uDC87');
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

const getUsers = async function() {
  try {
    // skip block, review modes
    const userIds = await query(`SELECT user_id FROM status WHERE mode = 'normal';`);
    return userIds.rows;
  } catch (e) {
    console.log(e);
    return [];
  }
};

const updateUserStatus = function(userId, status, event) {
  try {
    query(`INSERT INTO status (user_id, mode, pointer)
           VALUES ('${userId}', '${status}', 1)
           ON CONFLICT (user_id)
           DO UPDATE SET mode = '${status}', pointer = 1, updated_at = NOW();`);
  } catch (e) {
    replyErrorMsg(e, event);
  }
};

const addWord = function (userId, word, annotation, event) {
  const dailyLimit = 30;
  // Check cache for userId_adding_count
  redisClient.get(userId+'_adding_count', async (err, res) => {
    if (err) {
      replyErrorMsg(err, event);
    }
    // null: no words added in 12 hours
    if (res === null || parseInt(res) < dailyLimit) {
      await query(`INSERT INTO voc (user_id, word, annotation) 
                   VALUES ('${userId}', '${word}', '${annotation}') 
                   ON CONFLICT (user_id, word) 
                   DO UPDATE SET annotation = '${annotation}', updated_at = NOW();`);
      query(`UPDATE status SET total = total + 1 WHERE user_id = '${userId}';`);
      redisClient.setex(userId+'_adding_count', expire, parseInt(res)+1);
      event.reply(`${word} (${annotation}) is saved.`);
    } else {
      return event.reply(`You can only add ${dailyLimit} new words every 12 hours.`);
    }
  });
};

const updateWord = async function(userId, word, annotation, event) {
  try {
    // Check if the word is in user's list
    const count = await query(`SELECT word
                               FROM voc
                               WHERE user_id = '${userId}'
                               AND word = '${word}';`);
    if (count.rows.length === 0) {
      return event.reply(`${word} is not in your word list.`);
    }

    await query(`UPDATE voc
                 SET annotation = '${annotation}',
                     updated_at = NOW()
                 WHERE word = '${word}'
                 AND user_id = '${userId}';`);
    event.reply(`The definition of ${word} is updated to ${annotation}.`);
  } catch (e) {
    replyErrorMsg(e, event);
  }
};

const showWords = async function (userId, event) {
  try {
    const res = await query(`SELECT word, annotation
                             FROM voc
                             WHERE user_id = '${userId}'
                             ORDER BY level ASC, updated_at ASC
                             LIMIT 25;`);
    if (res.rows.length === 0) {
      event.reply('There isn\'t any word in your list.');
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
    event.reply(`${word} is removed from your list.`);
    query(`UPDATE status SET total = total - 1 WHERE user_id = '${userId}';`);
  } catch (e) {
    replyErrorMsg(e, event);
  }
};

const isReviewMode = async function (userId, userMsg, event, callback) {
  redisClient.get(userId+'_mode', async (err, res) => {
    if (err) {
      replyErrorMsg(err, event);
    }

    // If there's no record in cache, fetch it from database
    if (res === null) {
      res = await query(`SELECT mode FROM status WHERE user_id = '${userId}';`);
      res = res.rows[0].mode;
      redisClient.set(userId+'_mode', res);
    }

    if (res === 'review') {
      if (userMsg === '#end') {
        endReviewMode(userId, null, event);
      } else {
        checkAnswer(userId, userMsg, event);
      }
      callback(true);
    } else {
      callback(false);
    }
  });
};

const startReviewMode = async function (userId, event) {
  try {
    // update the status to review in database and cache
    query(`UPDATE status SET mode = 'review' WHERE user_id = '${userId}';`);
    redisClient.setex(userId+'_mode', expire, 'review');

    // select 25 words to review and save in cache
    let words = await query(`SELECT word, annotation, level
                             FROM voc
                             WHERE user_id = '${userId}'
                             ORDER BY level ASC, updated_at ASC
                             LIMIT 25;`);
    words = words.rows;
    if (words.length === 0) {
      event.reply('There\'s any word in your list.');
    }
    const reviewData = {
      pointer: 0,
      score: 0,
      total: words.length
    };
    for (let i in words) {
      reviewData[i] = words[i];
    }
    redisClient.setex(userId+'_review', reviewExpire, JSON.stringify(reviewData));

    // Print the first word
    event.reply('Turn on review mode \uDBC0\uDC8D\nPlease enter the definition of this word:\n'+words[0].word);
  } catch (e) {
    replyErrorMsg(e, event);
  }
};

const checkAnswer = async function(userId, userMsg, event) {
  redisClient.get(userId+'_review', (err, res) => {
    if (err) {
      replyErrorMsg(err, event);
    }
    if (!res) {
      replyErrorMsg('empty review table', event);
    }

    // Get the correct annotation
    const data = JSON.parse(res);
    const pointer = data.pointer;
    const word = data[pointer];
    const answer = word.annotation;

    // Compare user's answer and update level, score, pointer and save it in cache
    let replyMsg = '';
    if (userMsg === answer) {
      data[pointer].level = data[pointer].level + 1;
      data.score = data.score + 1;
      replyMsg += 'Correct! \uDBC0\uDC79';
    } else {
      data[pointer].level = data[pointer].level - 1;
      replyMsg += `Wrong.. \uDBC0\uDC7D\nIt should be "${answer}"`;
    }
    data.pointer = data.pointer + 1;
    redisClient.setex(userId+'_review', reviewExpire, JSON.stringify(data));

    // If pointer >= total, endReviewMode
    if (data.pointer >= data.total) {
      endReviewMode(userId, replyMsg, event);
    } else {
      // Send next word
      event.reply(replyMsg+`\nNext word: ${data[pointer+1].word}`);
    }
  });
};

const endReviewMode = async function(userId, replyMsg, event) {
  redisClient.get(userId+'_review', (err, res) => {
    if (err) {
      replyErrorMsg(err, event);
    }
    if (!res) {
      replyErrorMsg('empty review data (end)', event);
    }

    const data = JSON.parse(res);

    // calculate score and update scoreMsg
    // const score = Math.round(data.score/data.total*100);
    let score = 0;
    let scoreMsg = '';
    if (replyMsg) {
      score = Math.round(data.score/data.total*100);
      scoreMsg = replyMsg + `Turn off review mode.\nYou got ${score} % right this time! `;
    } else { // incomplete review
      score = Math.round(data.score/data.pointer*100);
      scoreMsg = `Turn off review mode.\nYou got ${score} % right this time! `
    }
    // let scoreMsg = replyMsg === null? `Turn off review mode.\nYou got ${score} % right this time! `: replyMsg + `Turn off review mode.\nYou got ${score} % right this time! `;
    switch (true) {
      case (score == 0): 
        scoreMsg += '\uDBC0\uDC7C';
        break;
      case (score < 60):
        scoreMsg += '\uDBC0\uDC8E';
        break;
      case (score < 80):
        scoreMsg += '\uDBC0\uDC90';
        break;
      case (score < 100):
        scoreMsg += '\uDBC0\uDC8A';
        break;
      case (score === 100):
        scoreMsg += '\uDBC0\uDC81';
        break;
      default:
        break;
    }
    event.reply(scoreMsg);

    // save changed levels to database
    for (let i = 0; i < data.total; i++) {
      query(`UPDATE voc
             SET level = ${data[i].level}, updated_at = NOW()
             WHERE word = '${data[i].word}'
             AND user_id = '${userId}';`);
    }

    // set status back to normal in database and cache
    query(`UPDATE status SET mode = 'normal' WHERE user_id = '${userId}';`);
    redisClient.setex(userId+'_mode', expire, 'normal');
  });
};

module.exports = {
  addWord,
  updateWord,
  showWords,
  deleteWord,
  startReviewMode,
  isReviewMode,
  checkAnswer,
  updateUserStatus,
  getUsers
};
