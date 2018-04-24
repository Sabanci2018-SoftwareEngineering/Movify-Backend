var Sequelize = require('sequelize');
var sqlite = require('sqlite3');

var db;
if (process.env.NODE_ENV != 'TEST'){
  db = new Sequelize(process.env.DBCONN);
}
else {
  var memoryDB = new sqlite.Database(':memory:');
  db = new Sequelize('sqlite://:memory:', { logging: false });
}

db.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

db.sync({ force: false });

module.exports = db;
