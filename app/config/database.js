var Sequelize = require('sequelize');

var db = new Sequelize( 'movify', '', '',
		{
			dialect: 'sqlite',
			storage: './movify.db'
		}
);

db.sync({ force: true });
db.query('PRAGMA foreign_keys = OFF;');

module.exports = db;
