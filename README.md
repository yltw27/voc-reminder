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
    * #end but status != review
    * only 1 word in list
  * bot.listen: join -> update status table

* Use caching
  * local redis
  * Heroku redis

* Update word or annotation
* Limit the number of show?
* Custom review limit
* default word list and import/export
* Test Cases (Mocha)

* How-to blog

* LineBot Rich Menu
  * Pretty buttons
    * review mode
    * end review
    * show
    * help
  * Welcome message

        Hello, {Nickname}！
        Thank you for adding {AccountName} :)

        [How to Use {AccoungName}]
        Add a new word:  + word/definition
        Update a word:   word/new definition
        Delete a word:   //word
        Review mode:     review
        End review mode: #end
        Show all words:  show

        - You can choose any language for words and definitions.
        - Happy Learning!

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

### Caching (Redis)

* [Learn to Cache your NodeJS Application with Redis in 6 Minutes!](https://itnext.io/learn-to-cache-your-nodejs-application-with-redis-in-6-minutes-745a574a9739)
