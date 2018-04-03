var db = require('../config/database.js');
var Sequelize = require('sequelize');

var UserRecommend = db.define('user_recommend', {
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
    },
    recommender: {
	type: Sequelize.STRING(15),
	allowNull: false,
	references: {
		model: 'user',
		key: 'username'
	}
    },
    info: {
	type: Sequelize.STRING,
	allowNull: false
    }
  }, {
	freezeTableName: true,
        indexes: [
                {
                        unique: true,
                        fields: [ 'username', 'movie', 'recommender' ]
                }
        ]
});

module.exports = UserRecommend;
