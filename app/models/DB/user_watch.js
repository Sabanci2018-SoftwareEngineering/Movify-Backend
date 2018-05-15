var db = require('../../config/database.js');
var Sequelize = require('sequelize');

var UserWatch = db.define('user_watch', {
    username: {
        type: Sequelize.STRING(15),
        allowNull: false,
        references: {
            model: 'user',
            key: 'username'
        },
        primaryKey: true
    },
    title: {
        type: Sequelize.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    rate: {
	type: Sequelize.ENUM,
	values: ['like', 'dislike'],
	allowNull: true,
    },
    comment: {
	type: Sequelize.STRING,
	allowNull: true
    },
    reason: {
        type: Sequelize.ENUM,
        values: ['feed', 'recommendation', 'other'],
        allowNull: false
    }
},
{
    freezeTableName: true,
    indexes: [
        {
            unique: true,
            fields: [ 'username', 'title' ]
        }
    ]
});

module.exports = UserWatch;
