const redis = require('redis');

const redis_port = process.env.REDIS_PORT;
const redis_client = redis.createClient(redis_port);

// middleware function to check cache
const get = function (id) {
  try {
    const res = redis_client.get(id, redis.print);
    return res;
  } catch (e) {
    console.log(e);
    return {};
  }
};

const set = function(id, data) {
  try {
    redis_client.hmset(id, JSON.stringify(data));
  } catch (e) {
    console.log(e);
  }
};

module.exports = {
  get,
  set
};