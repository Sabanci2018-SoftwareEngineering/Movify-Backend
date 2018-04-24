var bcrypt = require('bcrypt');
var assert = require('chai').assert;

var UserModel = require('../app/models/DB/user.js');
var FollowModel = require('../app/models/DB/user_follow.js');
var ForgotModel = require('../app/models/DB/user_forgot.js');
var RecommendModel = require('../app/models/DB/user_recommend.js');
var WatchModel = require('../app/models/DB/user_watch.js');
var WatchlistModel = require('../app/models/DB/user_watchlist.js');
var ActivationModel = require('../app/models/DB/user_activation.js');

var UserController = require('../app/controllers/user');

var User = new UserController(UserModel, ActivationModel, FollowModel, ForgotModel, WatchlistModel);

describe('Register a new user', (done) => {
    it('Register a new user with username "appleseed.john" and password "password"', (done) => {
        User.registerUser('appleseed.john', 'johnappleseed@icloud.com', 'password', (err) => {
            if (err) {
                done(err);
            }

            // Query the database for the inserted user
            UserModel.findOne({ where: { username: 'appleseed.john' }})
            .then((user) => {
                assert(user.get('username') == 'appleseed.john', 'username mismatched!');
                assert(user.get('email') == 'johnappleseed@icloud.com', 'email mismatched!');
                bcrypt.compare("password", user.get('password'), (err, same) => {
                    if (err) {
                        done(err);
                    }
                    else {
                        assert(same, 'password mismatched!');
                    }
                })
                done();
            })
            .catch(err => done(err));
        });
    })
})

describe('Add, remove and fetch user watchlist items', (done) => {
    it('Insert title having id 27205 (Inception) to the watchlist', (done) => {
        // previous test case has inserted a user with username appleseed.john, use that
        User.addToWatchlist('appleseed.john', 27205, (err) => {
            if (err) { return done(err); }
            
            WatchlistModel.findOne({ where: { username: 'appleseed.john' }})
            .then((watchlist) => {
                assert(watchlist.get('username'), 'appleseed.john', 'username mismatch!');
                assert(watchlist.get('title'), '27205', 'title id mismatch!');
            })
            .catch(err => done(err));
            
            done();
        })
    });

    it('Retrieve all watchlist items for appleseed.john and check if the only existent title is 27205', (done) => {
        User.getWatchlist('appleseed.john', (err) => {
            if (err) { return done(err); }

            WatchlistModel.findAll({ where: { username: 'appleseed.john' }})
            .then((watchlist) => {
                assert(watchlist.length == 1, 'length of watchlist mismatches 1');
                assert(watchlist[0].username == 'appleseed.john', 'watchlist item username mismatches');
                assert(watchlist[0].title == '27205', 'watchlist title mismatches 27205');
            })
            .catch(err => done(err));

            done();
        })
    });

    it('Remove title 27205 from watchlist', (done) => {
        User.removeFromWatchlist('appleseed.john', 27205, (err) => {
            if (err) { return done(err); }

            WatchlistModel.count({ where: { username: 'appleseed.john' }})
            .then((count) => {
                assert(count == 0, 'there is still an item in the watchlist!');
            })
            .catch(err => done(err));

            done();
        })
    });
})