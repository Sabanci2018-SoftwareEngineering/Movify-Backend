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
// parse request body of type JSON
app.use(bodyParser.json());
// parse request body of type application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

app.set('PORT', process.env.PORT || 3000); // set the port

app.use('/', require('./app/routes/api.js')); // use routes

// MARK: Server launch
app.listen(app.get('PORT'), () => {
    console.log('Listening on port ' + app.get('PORT'));
});