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

describe('Register a new user', (done) => {
    it('Register a new user with username "appleseed.john" and password "password"', (done) => {
        User.registerUser(mockUser, mockEmail, mockPw, err => done(err));
    })
})

describe('Activate user', (done) => {
    it('Activate the appleseed.john user', (done) => {
	ActivationModel.findOne({ where: { username: mockUser }})
		.then((activation_model) => {
			assert(activation_model, 'activation key not created!')
			User.activateUser(mockUser, activation_model.activation_key, err => done(err));
		})
		.catch(err => done(err));
    })
})


describe('Login with that email', (done) => {
    it('Login with email "johnappleseed@icloud.com" and password "password"', (done) => {
	User.loginUser(mockEmail, mockPw, err => done(err));
    })
})

describe('Login with that username', (done) => {
    it('Login with username "appleseed.john" and password "password"', (done) => {
	User.loginUser(mockUser, mockPw, err => done(err));
    })
})

describe('Forgot password', (done) => {
    it('Forgot password with email "johnappleseed@icloud.com"', (done) => {
	User.forgotPassword(mockEmail, err => done(err));
    })
})

describe('Change password', (done) => {
    it('Change password with email "johnappleseed@icloud.com"', (done) => {
	UserModel.findOne({where: { email: mockEmail }})
		.then((user) => {
			assert(user, 'user does not exists!');
			ForgotModel.findOne({ where: { username: user.username }})
                		.then((forgot_model) => {
                        		assert(forgot_model, 'forgot key not created!')
                        		User.changePassword(mockEmail, forgot_model.forgot_key, 'passwd', err => done(err));
                		})
                		.catch(err => done(err));

		})
		.catch(err => done(err));
    })
})

describe('Login with new password', (done) => {
    it('Login with username "appleseed.john" and password "passwd"', (done) => {
	User.loginUser(mockUser, 'passwd', err => done(err));
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

    it('Retrieve all watchlist items for appleseed.john and check if the only existent title is 27205', (done) => {
        User.getWatchlist(mockUser, (err) => {
            if (err) { return done(err); }

            WatchlistModel.findAll({ where: { username: mockUser }})
            .then((watchlist) => {
                assert(watchlist.length == 1, 'length of watchlist mismatches 1');
                assert(watchlist[0].username == mockUser, 'watchlist item username mismatches');
                assert(watchlist[0].title == '27205', 'watchlist title mismatches 27205');
            })
            .catch(err => done(err));

            done();
        })
    });

    it('Remove title 27205 from watchlist', (done) => {
        User.removeFromWatchlist(mockUser, 27205, (err) => {
            if (err) { return done(err); }

            WatchlistModel.count({ where: { username: mockUser }})
            .then((count) => {
                assert(count == 0, 'there is still an item in the watchlist!');
            })
            .catch(err => done(err));

            done();
        })
    });
})

describe('Add, remove and fetch watched user items', (done) => {
    it('Add title with id 27205 to the watched titles list', (done) => {
        User.addWatchedMovie(mockUser, 27205, null, (err) => {
            assert(err == null, 'addWatchedMovie with id 27205 returned with error');
        });
    });

    it('Add title with id 27206 to the watched titles list', (done) => {
        User.addWatchedMovie(mockUser, 27206, null, (err) => {
            assert(err == null, 'addWatchedMovie with id 27206 returned with error');
        })
    });

    it('Fetch all titles of user', (done) => {
        User.getWatchedMovies(mockUser, (err, results) => {
            assert(err == null, 'getWatchedMovies returned with error');
            props = []
        })
    })
})
