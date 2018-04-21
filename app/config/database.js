var Sequelize = require('sequelize');

var db = new Sequelize(process.env.DBCONN);

db.authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });

db.sync({ force: false });

module.exports = db;
