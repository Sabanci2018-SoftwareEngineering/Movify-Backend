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
		type: Sequelize.STRING(60),
		allowNull: false
	},
	picture: {
		type: Sequelize.STRING(10),
		allowNull: false,
		defaultValue: '0000000001'
	},
	isActive: {
		type: Sequelize.BOOLEAN,
		allowNull: false,
		defaultValue: false
	},
	followerCount: {
		type: Sequelize.INTEGER,
		allowNull: false,
		defaultValue: 0
	},
	followingCount: {
		type: Sequelize.INTEGER,
		allowNull: false,
		defaultValue: 0
	}
},
{
	freezeTableName: true
});

module.exports = User;
