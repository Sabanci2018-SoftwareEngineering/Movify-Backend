class TMDB {
    constructor(MovieDB) {
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