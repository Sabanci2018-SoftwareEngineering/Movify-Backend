var db = require('../../config/database.js');
var Sequelize = require('sequelize');

var UserActivation = db.define('user_activation', {
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
	activation_key: {
		type: Sequelize.STRING(8),
		allowNull: false
	}}, 
	{
		freezeTableName: true
	});
	
module.exports = UserActivation;
