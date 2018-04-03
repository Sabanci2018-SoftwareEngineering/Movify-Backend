var db = require('../config/database.js');
var Sequelize = require('sequelize');

var UserWatch = db.define('user_watch', {
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
    reason: {
	type: Sequelize.ENUM,
	values: ['feed', 'recommendation', 'other'],
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

module.exports = UserWatch;
