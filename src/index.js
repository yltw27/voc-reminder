const {app, dailyReminder} = require('./app');

const port = process.env.PORT;

app.listen(port, function() {
  console.log('Server is up! Listening on port: ', port);
  dailyReminder();
});