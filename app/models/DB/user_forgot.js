var db = require('../../config/database.js');
var Sequelize = require('sequelize');

var UserForgot = db.define('user_forgot', {
	username: {
		type: Sequelize.STRING(15),
		allowNull: false,
		primaryKey: true,
		references: {
			model: 'user',
			key: 'username'
		},
		primaryKey: true
	},
	forgot_key: {
		type: Sequelize.STRING(8),
		allowNull: false
	},
	expiry_date: {
		type: Sequelize.DATE,
		allowNull: true
	}
}, {
	freezeTableName: true
});

module.exports = UserForgot;
