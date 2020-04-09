const express = require('express');

require('./db/mongoose');
const userRouter = require('./routers/user');

const app = express();

// Automatically parse JSON input
app.use(express.json()); 

// Register the router with express app
app.use(userRouter); 

module.exports = app;