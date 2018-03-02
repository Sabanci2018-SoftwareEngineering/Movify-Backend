process.env.NODE_ENV = 'test';

let chai = require('chai');
let chaiHttp = require('chai-http');
let server = require('../server');
let should = chai.should();

chai.use(chaiHttp);

// GET '/title/:targetID' route
describe('[GET] /title/tt1375666', () => {
    it('it should get detailed data on movie "Inception"', (done) => {
        chai.request(server)
            .get('/title/tt1375666')
            .end((err, res) => {
                // header checks
                res.should.have.status(200);
                res.should.be.a('object');

                // check whether a successful response body was returned
                res.body.should.have.ownPropertyDescriptor('success', {
                    value: true,
                    writable: true,
                    enumerable: true,
                    configurable: true
                });
                res.body.should.have.property('results');
                // check if all propertıes exist [TODO: a better way of checking all fields]
                properties = ['Title', 'Year', 'Rated', 'Released', 'Runtime', 'Genre', 'Director',
                    'Writer', 'Actors', 'Plot', 'Language', 'Country', 'Awards', 'Poster', 'Ratings',
                    'Metascore', 'imdbRating', 'imdbVotes', 'imdbID', 'Type', 'DVD', 'BoxOffice',
                    'Production', 'Website', 'Response'];
                for (var i = 0; i < properties.length; i++) {
                    res.body.results.should.have.property(properties[i]);
                }
                done();
            });
    });
});