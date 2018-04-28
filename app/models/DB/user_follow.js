var db = require('../../config/database.js');
var Sequelize = require('sequelize');

var UserFollow = db.define('user_follow', {
	username: {
		type: Sequelize.STRING(15),
		allowNull: false,
		references: {
			model: 'user',
			key: 'username'
		},
		primaryKey: true
	},
	follows: {
		type: Sequelize.STRING(15),
		allowNull: false,
		references: {
			model: 'user',
			key: 'username'
		},
		primaryKey: true
	}
}, 
{
	freezeTableName: true,
	indexes: [
		{
			unique: true,
			fields: [ 'username', 'follows' ]
		}
	]
});

module.exports = UserFollow;
