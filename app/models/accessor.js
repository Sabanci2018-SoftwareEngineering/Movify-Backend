var UserWatchlist = require('./DB/user_watchlist');

class Accessor {
    static getWatchlist(username, callback) {
        UserWatchlist.findAll({ where: { username: username} })
        .then((watchlist) => {
            if (!watchlist) {
                return callback("user " + username + " does not have a watchlist");
            }
            return callback(null, watchlist);
        })
        .catch((err) => {
            return callback(err);
        })
    }
}

module.exports = Accessor;