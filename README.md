# Voc Reminder

Build up a Line ChatBot to let users create vocabulary list and review it based on spaced repetition.

## TODOs

* Logo [done]
* PostgreSQL - CRUD
  * save words: + word/annotation [done]
  * Show voc list: show [done]
  * Delete words: //word [done]
  * Update words: word/annotation [done]
  * Check daily limit (15 words?) before insertion [done]
  * Pretty show [done]
  * Review (based on spaced repetition)
    * score calculation

* Use caching ?
* Convert to English version
* Test Cases (Mocha)
* How-to blog
* Update word or annotation
* Limit the number of show?
* Custom review limit

* LineBot Rich Menu
  * Add button for introduction (basic commands)
  * Welcome message

        {Nickname}，您好(hello)！
        感謝您成為{AccountName}的好友！

        [使用說明]
        新增單字： +新單字/定義 ( +mobile/手機 )
        修改定義： 單字/新定義 ( mobile/行動電話 )
        刪除單字： //單字 ( //mobile )
        複習單字： review
        結束複習： #end
        顯示單字： show

        複習模式有時回覆很慢，請過1分鐘後重傳一次答案，或直接輸入 #end 結束複習。

        若不想接收提醒，可以點畫面右上方的選單圖示，然後關閉「提醒」喔。

* IELTs/TOEIC/exams voc?

## PostgreSQL

* Login `heroku pg:psql`

* Create table

      CREATE TABLE voc (
        id serial NOT NULL PRIMARY KEY,
        user_id VARCHAR(80) NOT NULL,
        word VARCHAR(80) NOT NULL,
        annotation VARCHAR(80),
        level INT DEFAULT 1,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        unique (user_id, word)
      );

      CREATE TABLE status (
        user_id VARCHAR(80) NOT NULL,
        mode VARCHAR(30) DEFAULT 'normal',
        pointer INT DEFAULT 0,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        unique (user_id)
      );

## Test Changes Locally

1. Start ngrok `ngrok http 3000` (Change 3000 to your port)
2. Update webhook URL on Line Messaging API page to https://xxxxxx.ngrok.io/yourWebhookName
3. `npm run dev`
4. Test your change via Line account

## References

### Line ChatBot

* [手把手教你建聊天機器人(linebot+nodjes+ngrok)](https://medium.com/@mengchiang000/%E6%89%8B%E6%8A%8A%E6%89%8B%E6%95%99%E4%BD%A0%E5%BB%BA%E8%81%8A%E5%A4%A9%E6%A9%9F%E5%99%A8%E4%BA%BA-linebot-nodjes-ngrok-7ad028d97a07)
* [Line Emoji Reference](https://devdocs.line.me/files/emoticon.pdf)

### Postgre

* To solve self certificate problem, uninstall pq module and reinstall it with `npm install pq@7`
* [Problem: Couldn't connect to local server](https://stackoverflow.com/questions/13573204/psql-could-not-connect-to-server-no-such-file-or-directory-mac-os-x)

* [Setting up a RESTful API with Node.js and PostgreSQL](https://blog.logrocket.com/setting-up-a-restful-api-with-node-js-and-postgresql-d96d6fc892d8/)
* [Heroku: Provision a database](https://devcenter.heroku.com/articles/getting-started-with-nodejs#provision-a-database)
* [node-postgres](https://node-postgres.com/)

### Spaced Repetition

* [Spaced repetition algorithm](https://zh.wikipedia.org/wiki/%E9%97%B4%E9%9A%94%E9%87%8D%E5%A4%8D)
