const {Pool} = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

const query = function(queryString) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    try {
      const res = pool.query(queryString);
      // const duration = Date.now() - start;
      // console.log('executed query', {queryString, duration});
      resolve(res);
    } catch (e) {
      reject(e);
    }
  });
};

module.exports = {

};