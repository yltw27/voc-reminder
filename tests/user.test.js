const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/user');
const {userOne, setupDatabase} = require('./fixtures/db');

beforeEach(setupDatabase);

test('Should sign up a new user', async () => {
  const response = await request(app).post('/users').send({
    name: 'Elsa',
    email: 'elsa@queen.com',
    password: 'letitgo'
  }).expect(201);

  // Assert the database was changed correctly
  const user = await User.findById(response.body.user._id);
  expect(user).not.toBeNull();

  // Assertions about the response
  expect(response.body).toMatchObject({
    user: {
      name: 'Elsa',
      email: 'elsa@queen.com'
    },
      token: user.tokens[0].token
  });
  expect(user.password).not.toBe('MyPass777!');
});

test('Shoule login existing user', async () => {
  const response = await request(app).post('/users/login').send({
    email: userOne.email,
    password: userOne.password
  }).expect(200);

  // Assert the user exists in the database
  const user = await User.findById({_id: response.body.user._id});
  expect(user).not.toBeNull();

  // Assert the token is matched
  expect(response.body.token).toBe(user.tokens[1].token);
});

test('Should not login non-existing user', async () => {
  await request(app).post('/users/login').send({
    email: userOne.name,
    password: userOne.email
  }).expect(400);
});

test('Should get profile for user', async() => {
  await request(app)
    .get('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`) // Set header
    .send()
    .expect(200);
});

test('Should not get profile for unauthenticated user', async () => {
  await request(app)
    .get('/users/me')
    .send()
    .expect(401);
});

test('Should delete the user account', async() => {
  await request(app)
    .delete('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send()
    .expect(200);

  const user = await User.findById(userOne._id);
  expect(user).toBeNull();
});

test('Should not delete the user account without authentication', async () => {
  await request(app)
    .delete('/users/me')
    .send()
    .expect(401);
});

test('Should update valid user fields', async () => {
  const response = await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
      name: 'Michael'
    })
    .expect(200);
  const user = await User.findById(userOne._id);
  expect(user.name).toBe('Michael');
});

test('Should not update invalid user fields', async () => {
  const response = await request(app)
    .patch('/users/me')
    .set('Authorization', `Bearer ${userOne.tokens[0].token}`)
    .send({
      location: 'Taipei'
    })
    .expect(400);
});