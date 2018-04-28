var db = require('../../config/database.js');
var Sequelize = require('sequelize');

var UserRecommend = db.define('user_recommend', {
	username: {
		type: Sequelize.STRING(15),
		allowNull: false,
		references: {
			model: 'user',
			key: 'username'
		},
		primaryKey: true
	},
	movie: {
		type: Sequelize.STRING(10),
		allowNull: false,
		primaryKey: true
	},
	recommender: {
		type: Sequelize.STRING(15),
		allowNull: false,
		references: {
			model: 'user',
			key: 'username'
		},
		primaryKey: true
	},
	info: {
		type: Sequelize.STRING,
		allowNull: false
	}
}, 
{
	freezeTableName: true,
	indexes: [
		{
			unique: true,
			fields: [ 'username', 'movie', 'recommender' ]
		}
	]
});

module.exports = UserRecommend;
