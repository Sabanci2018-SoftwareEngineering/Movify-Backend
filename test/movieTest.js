var expect = require('chai').expect;

var TMDB = require('../app/controllers/movie.js');
var mockMovieDB = require('../app/controllers/mockMovie.js');
var tmdb = new TMDB(mockMovieDB);

describe('Search for keyword "Inception" [mock data]', (done) => {
    it('it should retrieve search results on keyword "Inception"', (done) => {
        tmdb.searchMovie('Inception', (err, res) => {
            expect(err).to.be.null;
            expect(res).to.exist;

            // check header keys
            headerProperties = ['page', 'total_results', 'total_pages', 'results'];
            for (var i = 0; i < headerProperties.length; i++) {
                expect(res.results).to.have.property(headerProperties[i]);
            }

            // check result keys
            resultProperties = ['vote_count', 'id', 'video', 'vote_average', 'title', 'popularity',
                'poster_path', 'original_language', 'original_title', 'genre_ids', 'backdrop_path',
                'adult', 'overview']
            for (var i = 0; i < res.results.length; i++) {
                for (var j = 0; j < resultProperties.length; j++) {
                    expect(res.results.results[i]).to.have.property(resultProperties[j]);
                }
            }

            done();
        });
    });
});

describe('Retrieve data for movie with ID 27205 [mock data]', (done) => {
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


describe('Retrieve credits for movie with ID 27205 [mock data]', (done) => {
    it('Movie credits data should be retrieved with success', (done) => {
        tmdb.movieCredits(27205, (err, res) => {
            expect(err).to.be.null;
            expect(res).to.exist;
        });

        done();
    });

    it('Cast data should contain proper keys', (done) => {
	tmdb.movieCredits(27205, (err, res) => {
  		const castProperties = ['cast_id', 'character', 'credit_id', 'gender',
        		'id', 'name', 'order', 'profile_path'];
        	for (var i = 0; i < castProperties.length; i++) {
            	    for (var j = 0; j < res.cast.length; j++) {
                	expect(res.cast[j]).to.have.property(castProperties[i]);
            	    }
        	}
	});

        done();
    });

    it('Crew data should contain proper keys', (done) => {
	tmdb.movieCredits(27205, (err, res) => {
       		const crewProperties = ['credit_id', 'department', 'gender', 'id',
          		'job', 'name', 'profile_path'];

        	for (var i = 0; i < crewProperties.length; i++) {
            	    for (var j = 0; j < res.crew.length; j++) {
                	expect(res.crew[j]).to.have.property(crewProperties[i]);
            	    }
        	}
	});

        done();
    });
});

describe('Retrieve details for artist with ID 1 [mock data]', (done) => {
    it('Artist information data should be retrieved with success', (done) => {
	tmdb.artistInfo(1, (err, res) => {
	    expect(err).to.be.null;
	    expect(res).to.be.exist;
	});

	done();
    });

    it('Information data should contain proper keys', (done) => {
	tmdb.artistInfo(1, (err, res) => {
		const props = ['id', 'name', 'biography'];
		for (var i = 0; i < props.length; i++) {
	    	    expect(res).to.have.property(props[i]);
		}
	});

	done();
    });

    it('Artist movie credits data should be retrieved with success', (done) => {
	tmdb.artistCredits(1, (err, res) => {
	    expect(err).to.be.null;
	    expect(res).to.be.exist;
	});

	done();
    });

    it('MovieCredits data should contain proper keys', (done) => {
	tmdb.artistCredits(1, (err, res) => {
		const props = ['original_title', 'poster_path', 'id', 'release_date', 'overview'];
		for (var i = 0; i < props.length; i++) {
	    	    for (var j = 0; j < res.length; j++) {
			expect(res[j]).to.have.property(props[i]);
	    	    }
		}
	});

	done();
    });

    it('Artist imagess data should be retrieved with success', (done) => {
	tmdb.artistImages(1, (err, res) => {
	    expect(err).to.be.null;
	    expect(res).to.be.exist;
	});

	done();
    });

    it('Images data should contain proper keys', (done) => {
	tmdb.artistImages(1, (err, res) => {
		const props = ['width', 'height', 'file_path'];
		for (var i = 0; i < props.length; i++) {
	    	    for (var j = 0; j < res.length; j++) {
			expect(res[j]).to.have.property(props[i]);
	    	    }
		}
	});

	done();
    });
});

