const request = require('supertest');
const {app, dailyReminder} = require('../src/app');
const assert = require('assert');
// const db = require('../src/db/postgres');

// const line = require('@line/bot-sdk');

// const client = new Client({
//   channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
//   channelSecret: process.env.LINE_CHANNEL_SECRET
// });

describe('test', () => {
  it('beginning', done => {
    const response = request(app)
    .post('/webhook')
    .send({
      'type': 'text',
      'message': 'hello'
    });

    console.log(response);
    done();
  });
});