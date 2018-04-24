class TMDB {
    constructor(MovieDB) {
        this.tmdb = MovieDB;
    }
    
    searchMovie(keyword, callback) {
        this.tmdb.searchMovie({ query: keyword }, (err, res) => {
            if (err) {
                return callback(err);
            }
            
            return callback(null, res);
        });
    }
    
    movieInfo(id, callback) {
        this.tmdb.movieInfo({ id: id }, (err, res) => {
            if (err) {
                return callback(err);
            }
            
            return callback(null, res);
        });
    }
    
    movieTrailer(id, callback) {
        this.tmdb.movieTrailers({ id: id }, (err, res) => {
            if (err) {
                return callback(err);
            }
            
            return callback(null, res);
        });
    }
    
    movieCredits(id, callback) {
        this.tmdb.movieCredits({ id: id }, (err, res) => {
            if (err) {
                return callback(err);
            }
            
            return callback(null, res);
        })
    }
}

module.exports = TMDB;