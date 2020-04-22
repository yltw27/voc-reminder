const {Pool} = require('pg');
const cache = require('./cache');

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

const addUserStatus = function(userId) {
  try {
    query(`INSERT INTO status (user_id, mode, pointer)
         VALUES ('${userId}', 'normal', 1)
         ON CONFLICT (user_id)
         DO UPDATE SET mode = 'normal', pointer = 1, updated_at = NOW();`);
  } catch (e) {
    replyErrorMsg(e, event);
  }
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
      return event.reply(`You can only add 15 new words every 24 hours.`);
    } else {
      await query(`INSERT INTO voc (user_id, word, annotation) 
                   VALUES ('${userId}', '${word}', '${annotation}') 
                   ON CONFLICT (user_id, word) 
                   DO UPDATE SET annotation = '${annotation}', updated_at = NOW();`);
      event.reply(`${word} (${annotation}) is saved.`);
      query(`UPDATE status SET total = total + 1 WHERE user_id = '${userId}';`);
    }
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
                             ORDER BY level ASC, updated_at ASC;`);
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

const isReviewMode = async function (userId, userMsg, event) {
  try {
    let mode = 'normal';
    const cacheResult = cache.get(userId);
    // Check if the user's mode is in redis
    if (cacheResult.status) {
      mode = cacheResult.status;
    // if not, fetch status in database
    } else {
      mode = await query(`SELECT mode FROM status WHERE user_id = '${userId}';`);
      mode = mode.rows[0].mode;
    }

    if (mode === 'normal' && userMsg === '#end') {
      event.reply('You are not in review mode.');
      cache.set(userId, 3600, JSON.stringify({'status': 'normal'}));
      return true; // end dialog
    }

    if (mode === 'review') {
      if (userMsg === '#end') {
        endReviewMode(userId, null, event);
      }
      cache.set(userId, 3600, JSON.stringify({'status': 'review'}));
      return true;
    }
    cache.set(userId, 3600, JSON.stringify({'status': 'normal'}));
    return false;
  } catch (e) {
    console.log(e);
    return false;
  }
};

const startReviewMode = async function (userId, event) {
  try {
    // // Save user's top 25 words into a temp table
    // await query(`CREATE TABLE review_${userId} AS
    //              SELECT voc.word, voc.annotation, voc.level, voc.updated_at
    //              FROM voc
    //              WHERE user_id = '${userId}'
    //              ORDER BY level ASC, updated_at ASC
    //              LIMIT 25;`); 

    // // add id, correct column
    // await query(`ALTER TABLE review_${userId}
    //              ADD COLUMN correct INT DEFAULT 0,
    //              ADD COLUMN id serial;`);

    query(`INSERT INTO status (user_id, mode, pointer)
           VALUES ('${userId}', 'review', 1)
           ON CONFLICT (user_id)
           DO UPDATE SET mode = 'review', pointer = 1;`);

    // save words and annotations in cache
    let words = await query(`SELECT word, annotation, level
                         FROM voc 
                         WHERE user_id = '${userId}' 
                         ORDER BY level ASC, updated_at ASC
                         LIMIT 25;`);
    words = words.rows;
    let wordDict = {};
    for (idx in words.rows) {
      wordDict[idx] = {
        word: words[idx].word,
        annotation: words[idx].annotation,
        level: words[idx].level,
        correct: 0
      };
    }
    cache.set(userId+'_voc', wordDict);
    cache.set(userId, {
      status: 'review',
      currentWord: words[0].word,
      total: words.length,
      pointer: 0,
      correct: 0
    });

    // Print the first word
    // const res = await query(`SELECT * FROM review_${userId} ORDER BY id LIMIT 1`);
    event.reply('Turn on review mode \uDBC0\uDC8D\nPlease enter the definition of this word:\n'+words[0].word);
  } catch (e) {
    replyErrorMsg(e, event);
  }
};

const checkAnswer = async function(userId, userMsg, event) {
  try {
    // get pointer from table status
    // let pointer = await query(`SELECT pointer, total FROM status WHERE user_id = '${userId}';`);
    // const total = pointer.rows[0].total;
    // pointer = pointer.rows[0].pointer;

    // // get the correct annotation and save result
    // let answer = await query(`SELECT * FROM review_${userId} WHERE id = ${pointer};`);
    // answer = answer.rows[0];

    // get pointer and other info from cache
    const userInfo = cache.get(userId);
    const userVoc = cache.get(userId+'_voc');
    const total = userInfo.total;
    let pointer = userInfo.pointer;
    const answer = userVoc[userInfo.currentWord].annotation;

    let replyMsg = '';
    if (userMsg.toLowerCase().trim() === answer) {
      // await query(`UPDATE review_${userId}
      //              SET level = ${answer.level+1}, correct = 1
      //              WHERE word = '${answer.word}';`);
      cache.set(userId+'_voc', {
        currentWord: {
          level: userVoc[currentWord].level + 1,
          correct: 1
        }
      });
      cache.set(userId, {
        correct: userInfo.correct + 1
      });
      replyMsg += 'Correct! \uDBC0\uDC79';
    } else {
      // await query(`UPDATE review_${userId}
      //              SET level = ${answer.level-1}
      //              WHERE word = '${answer.word}';`);
      cache.set(userId+'_voc', {
        currentWord: {
          level: userVoc[currentWord].level - 1
        }
      });
      replyMsg += `Wrong.. \uDBC0\uDC7D\nIt should be "${answer.annotation}"`;
    }

    // If 25/all words are reviewed, leave review mode
    pointer += 1;
    if (pointer >= 25 || pointer >= total) {
      endReviewMode(userId, replyMsg, event);
    } else {
      query(`UPDATE status
             SET pointer = ${pointer}
             WHERE user_id = '${userId}';`);
      
      cache.set(userId, {
        pointer: pointer
      });

      // const res = await query(`SELECT word FROM review_${userId} WHERE id = ${pointer};`);

      const nextWord = cache.get(userId+'voc')[pointer].word;

      // nextWord = res.rows[0].word;
      event.reply(replyMsg+`\nNext word: ${nextWord}`);
    }
  } catch (e) {
    replyErrorMsg(e, event);
  }
};

const endReviewMode = async function(userId, replyMsg, event) {
  try {
    // let pointer = await query(`SELECT pointer FROM status WHERE user_id = '${userId}';`);
    // pointer = parseInt(pointer.rows[0].pointer)-1;
    // const res = await query(`SELECT sum(correct), count(correct) FROM review_${userId};`);

    const userInfo = cache.get(userId);
    const correct = userInfo.correct;
    const total = userInfo.total;

    // const score = Math.round(parseInt(res.rows[0].sum) / pointer * 100);
    const score = Math.round(correct/total*100);

    let scoreMsg = `Turn off review mode.\nYou got ${score} % right this time! `;
    if (replyMsg !== null) {
      scoreMsg = `${replyMsg}\n` + scoreMsg;
    }
    
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

    cache.set(userId, {'status': 'normal'});

    // save changed levels to voc table
    await query(`UPDATE voc voc
                 SET level = review.level, updated_at = now()
                 FROM review_${userId} review
                 WHERE voc.word = review.word
                 AND review.id <= ${pointer}
                 AND voc.user_id = '${userId}';`);
    // find a way to update postgres db by JSON

    // set mode to 'normal' and pointer to 1 (status table)
    query(`UPDATE status
           SET mode = 'normal', pointer = 1
           WHERE user_id = '${userId}';`);
    
    query(`DROP TABLE review_${userId};`);
  } catch (e) {
    replyErrorMsg(e, event);
  }
};

module.exports = {
  addWord,
  updateWord,
  showWords,
  deleteWord,
  startReviewMode,
  isReviewMode,
  checkAnswer,
  addUserStatus
};
