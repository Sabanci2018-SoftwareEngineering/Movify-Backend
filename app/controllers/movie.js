function _checkTitleKeys(object) {
    const props = ['original_title', 'poster_path', 'id'];
    const objectKeys = Object.keys(object);
    for (var i = 0; i < props.length; i++) {
        if (!(objectKeys.includes(props[i]))) {
            throw 'Object keys does not conform with the title model';
        }
    }
}

function _checkArtistKeys(object) {
    const props = ['id', 'name', 'biography'];
    const objectKeys = Object.keys(object);
    for (var i = 0; i < props.length; i++) {
        if (!(objectKeys.includes(props[i]))) {
            throw 'Object keys does not conform with the artist model';
        }
    }
}

class TMDB {
    constructor(MovieDB) {
        this.tmdb = MovieDB;
    }
    
    searchMovie(keyword, callback) {
        this.tmdb.searchMovie({ query: keyword }, (err, res) => {
            if (err) {
                return callback(err);
            }

            for (var i = 0; i < res.length; i++) {
                _checkTitleKeys(res.results[i]);
            }

            return callback(null, res);
        });
    }
    
    artistInfo(id, callback) {
	this.tmdb.personInfo({ id: id }, (err, res) => {
	    if (err) return callback(err);
	    _checkArtistKeys(res);

	    return callback(null, res);
	});
    }
    
    artistCredits(id, callback) {
	this.tmdb.personMovieCredits({ id: id }, (err, res) => {
	    if (err) return callback(err);

	    return callback(null, res);
	});
    }
    
    artistImages(id, callback) {
	this.tmdb.personImages({ id: id }, (err, res) => {
	    if (err) return callback(err);

	    return callback(null, res);
	});
    }
    
    movieInfo(id, callback) {
        this.tmdb.movieInfo({ id: id }, (err, res) => {
            if (err) {
                return callback(err);
            }
            _checkTitleKeys(res);

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
