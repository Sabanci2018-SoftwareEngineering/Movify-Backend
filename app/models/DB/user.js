var db = require('../../config/database.js');
var Sequelize = require('sequelize');

var User = db.define('user', {
	username: {
		type: Sequelize.STRING(15),
		allowNull: false,
		primaryKey: true
	},
	email: {
		type: Sequelize.STRING(320),
		allowNull: false
	},
	password: {
		type: Sequelize.STRING(40),
		allowNull: false
	},
	picture: {
		type: Sequelize.STRING(10),
		allowNull: false,
		defaultValue: '0000000001'
	},
	name: {
		type: Sequelize.STRING,
		allowNull: false
	},
	bio: {
		type: Sequelize.STRING,
		allowNull: false,
		defaultValue: 'mysterious..'
	},
	isActive: {
		type: Sequelize.BOOLEAN,
		allowNull: false,
		defaultValue: false
	}
}, 
{
	freezeTableName: true
});

module.exports = User;
