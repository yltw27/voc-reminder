# Voc Reminder

Build up a service to let users create vocabulary list and get notify through Line ChatBot based on [spaced repetition](https://en.wikipedia.org/wiki/Spaced_repetition).

## TODOs

* How to test locally
* PostgreSQL - CRUD
  * Save inputs into PostgreSQL on Heroku
  * Update data by text commands (測試/刪除/..)
  
  1. Save inputs into Postgre database on Heroku
      * userId (String)
      * text (String)
      * active (Boolean)
      * familarity (Number)
      * createdAt (Date)
      * updatedAt (Date)
  2. Show voc list
  3. Update words
  4. Delete words
  5. Next
      * Test
      * Reminder (based on spaced repetition)
      * Automatically archive vocabulary which is created X (?) ago with 100% familarity.

* [Spaced repetition algorithm](https://zh.wikipedia.org/wiki/%E9%97%B4%E9%9A%94%E9%87%8D%E5%A4%8D)
* Test Cases
* LineBot Rich Menu
* Logo

## References

### Line ChatBot

* [手把手教你建聊天機器人(linebot+nodjes+ngrok)](https://medium.com/@mengchiang000/%E6%89%8B%E6%8A%8A%E6%89%8B%E6%95%99%E4%BD%A0%E5%BB%BA%E8%81%8A%E5%A4%A9%E6%A9%9F%E5%99%A8%E4%BA%BA-linebot-nodjes-ngrok-7ad028d97a07)

### Postgre

* [Problem: Couldn't connect to local server](https://stackoverflow.com/questions/13573204/psql-could-not-connect-to-server-no-such-file-or-directory-mac-os-x)
* [Setting up a RESTful API with Node.js and PostgreSQL](https://blog.logrocket.com/setting-up-a-restful-api-with-node-js-and-postgresql-d96d6fc892d8/)
* [Heroku: Provision a database](https://devcenter.heroku.com/articles/getting-started-with-nodejs#provision-a-database)
* [使用Postman測試LINE Bot訊息推送](https://dotblogs.com.tw/tingi/2019/04/14/172942)
