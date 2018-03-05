process.env.NODE_ENV = 'test';

var TMDB = require('../app/models/movie.js');
var expect = require('chai').expect;

var tmdb = new TMDB();

describe('Search for keyword "Inception"', (done) => {
    it('it should retrieve search results on keyword "Inception"', (done) => {
        tmdb.searchMovie('Inception', (err, res) => {
            expect(err).to.be.null;
            expect(res).to.exist;

            // check header keys
            headerProperties = ['page', 'total_results', 'total_pages', 'results'];
            for (var i = 0; i < headerProperties.length; i++) {
                expect(res).to.have.property(headerProperties[i]);
            }

            // check result keys
            resultProperties = ['vote_count', 'id', 'video', 'vote_average', 'title', 'popularity',
                'poster_path', 'original_language', 'original_title', 'genre_ids', 'backdrop_path',
                'adult', 'overview']
            for (var i = 0; i < res.results.length; i++) {
                for (var j = 0; j < resultProperties.length; j++) {
                    expect(res.results[i]).to.have.property(resultProperties[j]);
                }
            }

            done();
        });
    });
});

describe('Retrieve data for movie with ID 27205', (done) => {
    it('it should retrieve detailed information on title with ID 27205', (done) => {
        tmdb.movieInfo(27205, (err, res) => {
            expect(err).to.be.null;
            expect(res).to.exist;

            // check for keys
            properties = ['adult', 'backdrop_path', 'belongs_to_collection', 'budget',
                'genres', 'homepage', 'id', 'imdb_id', 'original_language', 'original_title',
                'overview', 'popularity', 'poster_path', 'production_companies', 'production_countries',
                'release_date', 'revenue', 'runtime', 'spoken_languages', 'status', 'tagline', 'title',
                'video', 'vote_average', 'vote_count'];
            for (var i = 0; i < properties.length; i++) {
                expect(res).to.have.property(properties[i]);
            }

            done();
        });
    });
});