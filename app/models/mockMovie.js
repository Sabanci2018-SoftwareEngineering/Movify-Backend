var fs = require('fs');
var path = require('path');

const filePath = __dirname + '/testData/';
//const errMsg = 'Cannot read mock data: '

class mockMovieDB {
    searchMovie(query, callback) {
        const fileName = 'searchMovie.txt';
        fs.readFile(filePath.concat(fileName), 'utf-8', (err, data) => {
            if (err) {
                return callback(err);
            }

            
            return callback(null, JSON.parse(data));
        });
    }

    movieInfo(id, callback) {
        const fileName = 'movieInfo.txt';
        fs.readFile(filePath.concat(fileName), 'utf-8', (err, data) => {
            if (err) {
                return callback(err);
            }

            return callback(null, JSON.parse(data));
        });
    }
}

module.exports = new mockMovieDB;