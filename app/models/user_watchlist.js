var db = require('../config/database.js');
var Sequelize = require('sequelize');

var UserWatchlist = db.define('user_watchlist', {
    username: {
	type: Sequelize.STRING(15),
	allowNull: false,
	references: {
		model: 'user',
		key: 'username'
	}
    },
    movie: {
	type: Sequelize.STRING(10),
	allowNull: false
    }
  }, {
	freezeTableName: true,
	indexes: [
		{
			unique: true,
			fields: [ 'username', 'movie' ]
		}
	]
});

module.exports = UserWatchlist;
