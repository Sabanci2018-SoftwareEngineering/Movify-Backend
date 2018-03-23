var Sequelize = require('sequelize');

var db = new Sequelize( 'movify', '', '',
		{
			dialect: 'sqlite',
			storage: './movify.db'
		}
);

module.exports = db;
