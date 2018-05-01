/* ================
*  MOVIFY APP SERVER
* -------------------
*   App entry point
   ================ */

// Load environment variables
require('dotenv').config();

// MARK: module imports
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var passport = require('passport');

// MARK: Express app instantaniation and configuration
var app = express();
// parse request body of type JSON
app.use(bodyParser.json());
// parse request body of type application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.set('PORT', process.env.PORT || 3000); // set the port

process.env.NODE_ENV = 'DEV';

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({ 
    secret: 'derpy',
    resave: false,
    saveUninitialized: false
 }));

app.use(passport.initialize());
app.use(passport.session());

require('./app/config/passport.js')(passport);

app.use('/', require('./app/routes/api.js')); // use routes

// MARK: Server launch
app.listen(app.get('PORT'), () => {
    console.log('Listening on port ' + app.get('PORT'));
});

module.exports = app; // required for testing
