
const {Pool} = require('pg');

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
    } else {
      await query(`INSERT INTO voc (user_id, word, annotation) 
                 VALUES ('${userId}', '${word}', '${annotation}') 
                 ON CONFLICT (user_id, word) 
                 DO UPDATE SET annotation = '${annotation}',
                               updated_at = NOW();`);
      event.reply(`已將 ${word} (${annotation}) 存到資料庫`);
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
    query(`UPDATE status SET total = total - 1 WHERE user_id = '${userId}';`);
  } catch (e) {
    replyErrorMsg(e, event);
  }
};

const isReviewMode = async function (userId, userMsg, event) {
  try {
    const res = await query(`SELECT mode FROM status WHERE user_id = '${userId}';`);
    if (userMsg === '#end') {
      endReviewMode(userId, event);
      return true;
    } else if (res.rows[0].mode === 'review') {
      return true;
    }
  } catch (e) {
    console.log(e);
    return false;
  }
};

const startReviewMode = async function (userId, event) {
  try {
    // Save user's top 25 words into a temp table
    await query(`CREATE TABLE review_${userId} AS
    SELECT voc.word, voc.annotation, voc.level, voc.updated_at
    FROM voc
    WHERE user_id = '${userId}'
    ORDER BY level ASC, updated_at ASC
    LIMIT 25;`); 

    // add id, correct column
    await query(`ALTER TABLE review_${userId}
               ADD COLUMN correct INT DEFAULT 0,
               ADD COLUMN id serial;`);

    query(`INSERT INTO status (user_id, mode, pointer)
           VALUES ('${userId}', 'review', 1)
           ON CONFLICT (user_id)
           DO UPDATE SET mode = 'review', pointer = 1;`);

    // Print the first word
    const res = await query(`SELECT * FROM review_${userId} ORDER BY updated_at ASC LIMIT 1`);
    event.reply('複習開始囉！請回答這個單字的意思：'+res.rows[0].word);
  } catch (e) {
    replyErrorMsg(e, event);
  }
};

const endReviewMode = async function(userId, event) {
  try {
    let pointer = await query(`SELECT pointer FROM status WHERE user_id = '${userId}';`);
    pointer = parseInt(pointer.rows[0].pointer)-1;
    const res = await query(`SELECT sum(correct), count(correct) FROM review_${userId};`);
    const score = Math.round(parseInt(res.rows[0].sum) / pointer * 100);
    let scoreMsg = `已結束複習模式。這次的答題正確率為: ${score} % `;
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

    // save changed levels to voc table
    await query(`UPDATE voc voc
           SET level = review.level, updated_at = now()
           FROM review_${userId} review
           WHERE voc.word = review.word
           AND review.id <= ${pointer}
           AND voc.user_id = '${userId}';`);

    // set mode to 'normal' and pointer to 1 (status table)
    query(`UPDATE status
           SET mode = 'normal', pointer = 1
           WHERE user_id = '${userId}';`);
    
    query(`DROP TABLE review_${userId};`);
  } catch (e) {
    replyErrorMsg(e, event);
  }
};

const checkAnswer = async function(userId, userMsg, event) {
  try {
    // get pointer from table status
    let pointer = await query(`SELECT pointer, total FROM status WHERE user_id = '${userId}';`);
    const total = pointer.rows[0].total;
    pointer = pointer.rows[0].pointer;

    // get the correct annotation and save result
    let answer = await query(`SELECT * FROM review_${userId} WHERE id = ${pointer};`);
    answer = answer.rows[0];

    let nextWord = '';
    // If 25/all words are reviewed, leave review mode,
    if (pointer == 25 || pointer >= total) {
      endReviewMode(userId, event);
    // else print the next word and update pointer.
    } else {
      query(`UPDATE status
             SET pointer = ${pointer+1}
             WHERE user_id = '${userId}';`);
      const res = await query(`SELECT word FROM review_${userId} WHERE id = ${pointer+1};`);
      // event.reply(`下一題：${res.rows[0].word}`);
      nextWord = res.rows[0].word;
    }

    if (userMsg.toLowerCase() === answer.annotation) {
      await query(`UPDATE review_${userId}
             SET level = ${answer.level+1}, correct = 1
             WHERE word = '${answer.word}';`);
      event.reply(`答對囉\uDBC0\uDC84\n下一題: ${nextWord}`);
    } else if (userMsg+'的' === answer.annotation) {
      await query(`UPDATE review_${userId}
             SET correct = 0.5
             WHERE word = '${answer.word}';`);
      event.reply(`差不多啦\uDBC0\uDC9D 原本是 ${answer.annotation}\n下一題: ${nextWord}`);
    } else {
      await query(`UPDATE review_${userId}
             SET level = ${answer.level-1}
             WHERE word = '${answer.word}';`);
      event.reply(`答錯啦\uDBC0\uDC7D 應該是 ${answer.annotation}\n下一題: ${nextWord}`);
    }
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
  checkAnswer
};
