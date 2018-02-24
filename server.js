/* ================
*  MOVIFY APP SERVER
* -------------------
*   App entry point
   ================ */

// MARK: module imports
var express = require('express');
var bodyParser = require('body-parser');

// MARK: Express app instantaniation and configuration
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.set('PORT', process.env.PORT || 3000); // set the port

app.use('/', require('./app/routes/api.js')); // use routes

// MARK: Server launch
app.listen(app.get('PORT'), () => {
    console.log('Listening on port ' + app.get('PORT'));
});