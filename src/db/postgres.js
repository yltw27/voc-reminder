
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true
});

module.exports = {
  query: (queryString, callback) => {
    const start = Date.now();
    return pool.query(queryString, (err, res) => {
      const duration = Date.now() - start;
      console.log('executed query', {queryString, duration}); //, rows: res.rowCount});
      callback(err, res);
    })
  },
};
