var bcrypt = require('bcrypt');
var assert = require('chai').assert;
var expect = require('chai').expect;

var UserModel = require('../app/models/DB/user.js');
var FollowModel = require('../app/models/DB/user_follow.js');
var ForgotModel = require('../app/models/DB/user_forgot.js');
var RecommendModel = require('../app/models/DB/user_recommend.js');
var WatchModel = require('../app/models/DB/user_watch.js');
var WatchlistModel = require('../app/models/DB/user_watchlist.js');
var ActivationModel = require('../app/models/DB/user_activation.js');

var UserController = require('../app/controllers/user');

var User = new UserController(UserModel, ActivationModel, FollowModel, ForgotModel, 
    WatchlistModel, WatchModel);

const mockUser = 'appleseed.john';
const mockEmail = 'johnappleseed@icloud.com'
const mockPw = 'password';

describe('Authentication and password logic tests', (done) => {

    it('Register a new user with username "appleseed.john" and password "password"', (done) => {
        User.registerUser(mockUser, mockEmail, mockPw, err => done(err));
    })

    it('Activate the appleseed.john user', (done) => {
        ActivationModel.findOne({ where: { username: 'appleseed.john' }})
        .then((activation_model) => {
            assert(activation_model, 'activation key not created!');
            User.activateUser('appleseed.john', activation_model.activation_key, (err) => {
                if (err) { done(err); }
                else {
                    UserModel.findOne({ where: { username: 'appleseed.john' }})
                    .then((user) => {
                        assert(user.get('isActive'), 'user is not active after activation');
                    })
                    done();
                }
            });

        })
        .catch(err => done(err));
    });

    it('Login with email "johnappleseed@icloud.com" and password "password"', (done) => {
        UserModel.findOne({ where: { username: 'appleseed.john' }})
        .then((user) => {
            if (!user.get('isActive')) {
                user.set('isActive', true);
                user.save();
            }
            User.loginUser('johnappleseed@icloud.com', 'password', err => done(err));
        })
        .catch(err => done(err));
    })

    it('Login with username "appleseed.john" and password "password"', (done) => {
        User.loginUser('appleseed.john', 'password', err => done(err));
    })

    it('Forgot password with email "johnappleseed@icloud.com"', (done) => {
	    User.forgotPassword('johnappleseed@icloud.com', err => done(err));
    })

    it('Change password with email "johnappleseed@icloud.com"', (done) => {
        UserModel.findOne({where: { email: 'johnappleseed@icloud.com' }})
        .then((user) => {
            assert(user, 'user does not exists!');
            ForgotModel.findOne({ where: { username: user.username }})
                        .then((forgot_model) => {
                                assert(forgot_model, 'forgot key not created!')
                                User.changePassword('johnappleseed@icloud.com', forgot_model.forgot_key, 'passwd', err => done(err));
                        })
                        .catch(err => done(err));

        })
        .catch(err => done(err));
    })

    it('Login with username "appleseed.john" and password "passwd"', (done) => {
        User.loginUser('appleseed.john', 'passwd', err => done(err));
    })
})

describe('Add, remove and fetch user watchlist items', (done) => {
    it('Insert title having id 27205 (Inception) to the watchlist', (done) => {
        // previous test case has inserted a user with username appleseed.john, use that
        User.addToWatchlist(mockUser, 27205, (err) => {
            if (err) { return done(err); }
            
            WatchlistModel.findOne({ where: { username: mockUser }})
            .then((watchlist) => {
                assert(watchlist.get('username'), mockUser, 'username mismatch!');
                assert(watchlist.get('title'), '27205', 'title id mismatch!');
            })
            .catch(err => done(err));
            
            done();
        })
    });

    it('Insert title having id 27206 to the watchlist', (done) => {
        User.addToWatchlist('appleseed.john', 27206, (err) => {
            if (err) { return done(err); }
            
            WatchlistModel.count({ where: { username: 'appleseed.john', title: 27206 }})
            .then((count) => {
                assert(count == 1, 'The number of database records with username "appleseed.john" and title 27206 is not 1!');
            })
            .catch(err => done(err));
            
            done();
        })
    });

    it('Retrieve all watchlist items for appleseed.john and check if the only existent title is 27205', (done) => {
        User.getWatchlist(mockUser, (err) => {
            if (err) { return done(err); }

            WatchlistModel.findAll({ where: { username: mockUser }})
            .then((watchlist) => {
                assert(watchlist.length == 2, 'length of watchlist mismatches 2');
                assert(watchlist[0].username == 'appleseed.john', 'watchlist item username mismatches');
                assert(watchlist[0].title == '27205', 'watchlist title mismatches 27205');
                assert(watchlist[1].title == '27206', 'watchlist title mismatches 27206');
                assert(watchlist[1].username == 'appleseed.john', 'watchlist item username mismatches');
            })
            .catch(err => done(err));

            done();
        })
    });

    it('Remove title 27205 from watchlist', (done) => {
        User.removeFromWatchlist(mockUser, 27205, (err) => {
            if (err) { return done(err); }

            WatchlistModel.count({ where: { username: mockUser, title: 27205 }})
            .then((count) => {
                console.log('count: ', count);
                assert(count == 0, 'there is still an item in the watchlist with id 27205!');
                WatchlistModel.count({ where: { username: mockUser, title: 27206}})
                .then((count) => {
                    assert(count == 1, 'item 27206 should be in database but it is not after deletion of 27205!');
                    done();
                })
                .catch(err => done(err));
            })
            .catch(err => done(err));
        });
    });
})


describe('Add, remove and fetch user watched items', (done) => {
    it('Insert title haivng id 27205 to the watched movies', (done) => {
        User.addWatchedMovie('appleseed.john', 27205, null, (err) => {
            WatchModel.count({ where: { username: 'appleseed.john', title: '27205' }})
            .then((count) => {
                assert(count == 1, 'Number of watched titles with id 27205 is not 1 after insertion!');
                done();
            })
            .catch(err => done(err));
        })
    });

    it('Insert title having id 27206 to the watched movies', (done) => {
        User.addWatchedMovie('appleseed.john', 27206, null, (err) => {
            WatchModel.count({ where: { username: 'appleseed.john', title: '27206' }})
            .then((count) => {
                assert(count == 1, 'Number of watched titles with id 27206 is not 1 after insertion!');
                done();
            })
            .catch(err => done(err));
        });
    });
});