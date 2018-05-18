var fs = require('fs');
var path = require('path');

const filePath = __dirname + '/testData/';

class mockMovieDB {
    _processFile(filename, callback) {
        fs.readFile(filePath.concat(filename), 'utf-8', (err, data) => {
            if (err) {
                return callback(err);
            }
    
            return callback(null, JSON.parse(data));
        });
    }

    searchMovie(query, callback) {
        this._processFile('searchMovie.txt', callback);
    }

    personInfo(id, callback) {
	this._processFile('artistInfo.txt', callback);
    }

    personMovieCredits(id, callback) {
	this._processFile('artistCredits.txt', callback);
    }

    personImages(id, callback) {
	this._processFile('artistImages.txt', callback);
    }

    movieInfo(id, callback) {
        this._processFile('movieInfo.txt', callback);
    }

    movieCredits(id, callback) {
        this._processFile('movieCredits.txt', callback);
    }

    movieTrailer(id, callback) {
        this._processFile('movieTrailer.txt', callback);
    }
}

module.exports = new mockMovieDB;
