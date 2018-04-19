var Sequelize = require('sequelize');

var db = new Sequelize('mysql:\/\/movifydbuser:g6gkCx87LS@mysqldbinstance.cm0uytgzeejo.eu-central-1.rds.amazonaws.com/movify_db');

db.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

db.sync({ force: true });
db.query('PRAGMA foreign_keys = OFF;');

module.exports = db;
