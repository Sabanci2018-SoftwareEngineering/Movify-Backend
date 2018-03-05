const MovieDB = require('moviedb')('52d83a93b06d28b814fd3ab6f12bcc2a');

class TMDB {
    constructor() {
        this.tmdb = MovieDB;
    }

    searchMovie(keyword, callback) {
        this.tmdb.searchMovie({ query: keyword }, (err, res) => {
            if (err) {
                callback(err);
            }

            callback(null, res);
        });
    }

    movieInfo(id, callback) {
        this.tmdb.movieInfo({ id: id }, (err, res) => {
            if (err) {
                callback(err);
            }

            callback(null, res);
        });
    }
}

module.exports = TMDB;