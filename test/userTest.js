var bcrypt = require('bcrypt');
var assert = require('chai').assert;
var expect = require('chai').expect;
var async = require('async');
var sequelize = require('sequelize');

var UserModel = require('../app/models/DB/user.js');
var FollowModel = require('../app/models/DB/user_follow.js');
var ForgotModel = require('../app/models/DB/user_forgot.js');
var RecommendModel = require('../app/models/DB/user_recommend.js');
var WatchModel = require('../app/models/DB/user_watch.js');
var WatchlistModel = require('../app/models/DB/user_watchlist.js');
var ActivationModel = require('../app/models/DB/user_activation.js');
var db = require('../app/config/database');
var userItem = require('../app/models/userItem');

var UserController = require('../app/controllers/user');

var User = new UserController(UserModel, ActivationModel, FollowModel, ForgotModel, 
    WatchlistModel, WatchModel, userItem, db);

const mockUser = 'appleseed.john';
const mockEmail = 'johnappleseed@icloud.com'
const mockPw = 'password';

// MARK: Utilities
function createUser(username, email, pwHash, callback) {
    UserModel.build({ username: username, email: email, password: pwHash }).save()
    .then((user) => {
        return callback();
    })
    .catch(err => callback(err));
}

async function teardownDatabase() {
    var models = [FollowModel, ForgotModel, RecommendModel, WatchModel, WatchlistModel, ActivationModel, UserModel];
    return new Promise((resolve, reject) => {
        async.each(models, (model, callback) => {
            model.destroy({ where: { }, truncate: true })
            .then((destroyedRows) => {
                resolve();
            })
            .catch(err => reject(err));
        }, (err) => {
            reject(err);
        });
    });
}

// MARK: Test suite
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

describe('Watchlist title tests', (done) => {
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

    it('Retrieve all watchlist items for appleseed.john', (done) => {
        User.getWatchlist(mockUser, (err) => {
            if (err) { return done(err); }

            WatchlistModel.findAll({ where: { username: mockUser }})
            .then((watchlist) => {
                assert(watchlist.length == 2, 'length of watchlist mismatches 2');
                for (var i = 0; i < watchlist.length; i++) {
                    assert(watchlist[i].username == 'appleseed.john', 'watchlist item username mismatches');
                }
                
                assert(watchlist[0].title == '27205', 'watchlist title mismatches 27205');
                assert(watchlist[1].title == '27206', 'watchlist title mismatches 27206');
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

describe('Watched title tests', (done) => {
    it('Insert title haivng id 27205 to the watched movies', (done) => {
        User.addWatchedMovie('appleseed.john', 27205, 'like', 'awesome!', null, (err) => {
            WatchModel.count({ where: { username: 'appleseed.john', title: '27205' }})
            .then((count) => {
                assert(count == 1, 'Number of watched titles with id 27205 is not 1 after insertion!');
                done();
            })
            .catch(err => done(err));
        })
    });

    it('Insert title having id 27206 to the watched movies', (done) => {
        User.addWatchedMovie('appleseed.john', 27206, 'dislike', 'not awesome!', null, (err) => {
            WatchModel.count({ where: { username: 'appleseed.john', title: '27206' }})
            .then((count) => {
                assert(count == 1, 'Number of watched titles with id 27206 is not 1 after insertion!');
                done();
            })
            .catch(err => done(err));
        });
    });

    it('Update title having id 27206 to liked', (done) => {
	User.updateWatchedMovie('appleseed.john', 27206, 'like', 'changed my mind', null, (err) => {
	    WatchModel.count({ where: { username: 'appleseed.john', title: '27206', rate: 'like' }})
	    .then((count) => {
		assert(count == 1, 'Title with id 27206 is not changed!');
		done();
	    })
	    .catch(err => done(err));
	});
    });

    it('Retrieve all watched items for appleed.john', (done) => {
        User.getWatchedMovies(mockUser, (err, movies) => {
            if (err) { done(err); }
            else {
                props = ['username', 'title', 'rate', 'comment', 'reason', 'createdAt', 'updatedAt'];
                for (var i = 0; i < movies.length; i++) {
                    for (var j = 0; j < props.length; j++) {
                        expect(movies[i].dataValues).to.have.property(props[j]);
                    }
                }
                done();
            }
        })
    });

    after((done) => {
        // teardown the database
        teardownDatabase()
        .then(() => done())
        .catch(err => {console.error('ERROR', err); done(err)});
    });
});

describe('User follow tests', (done) => {
    beforeEach(((done) => {
        // create three users
        async.parallel([
            (callback) => {
                createUser('user1', 'user1@domain.com', 'user1password', err => callback(err));
            },
            (callback) => {
                createUser('user2', 'user2@domain.com', 'user2password', err => callback(err));
            },
            (callback) => {
                createUser('user3', 'user3@domain.com', 'user3password', err => callback(err));
            }
        ], (err, result) => {
            done(err);
        });
    }));

    afterEach((done) => {
        teardownDatabase()
        .then(() => done())
        .catch(err => done(err));
    });

    it('user1 follows user2, expect proper database entries', (done) => {
        User.followUser('user1', 'user2', (err) => {
            if (err) { return done(err); }

            async.parallel([
                (callback) => {
                    FollowModel.count({ where: { username: 'user1', follows: 'user2' }})
                    .then((count) => {
                        assert(count == 1, 'FollowModel should have exactly 1 entry where user1-[FOLLOWS]->user2!');
                        callback();
                    })
                    .catch(err =>  callback(err));
                },
                (callback) => {
                    UserModel.find({ where: { username: 'user1' }})
                    .then(user => {
                        assert(user.followerCount == 0, 'user1 should have 0 followers');
                        assert(user.followingCount == 1, 'user1 should have 1 following');
                        callback();
                    })
                    .catch(err => callback(err));
                },
                (callback) => {
                    UserModel.find({ where: { username: 'user2' }})
                    .then(user => {
                        assert(user.followerCount == 1, 'user2 should hav 1 follower');
                        assert(user.followingCount == 0, 'user2 should have 0 followers');
                        callback();
                    })
                    .catch(err => callback(err));
                }
            ], (err) => {
                done(err);
            })

        });
    });

    it('user1 unfollows user2, expect proper database entries', (done) => {
        // set up follows
        async.series([
            (callback) => {
                FollowModel.create({ username: 'user1', follows: 'user2' })
                .nodeify(callback);
            },
            (callback) => {
                UserModel.increment('followingCount', { where: {username: 'user1' }})
                .nodeify(callback);
            },
            (callback) => {
                UserModel.increment('followerCount', { where: {username: 'user2' }})
                .nodeify(callback);
            },  
            (callback) => {
                User.unfollowUser('user1', 'user2', err => callback(err));
            },
            (callback) => {
                async.parallel([
                    (callback) => {
                        FollowModel.count({ where: {username: 'user1', follows: 'user2' }})
                        .then((count) => {
                            assert(count == 0, 'FollowModel should not have a record where user1-[FOLLOWS]->user2');
                            callback();
                        })
                        .catch(err => callback(err));
                    },
                    (callback) => {
                        UserModel.find({ where: { username: 'user1' }})
                        .then(user => {
                            assert(user.followingCount == 0, 'user1 should not be following anybody');
                            assert(user.followerCount == 0, 'user1 should not have any followers');
                            callback();
                        })
                        .catch(err => callback(err));
                    }], err => callback(err));
            }
        ], err => done(err));
    });

    it('user1 retrieves their followers, where user2 and user3 follows user1', (done) => {
        // make user2 and user3 follow user1
        async.series([
            (callback) => {
                FollowModel.build({ username: 'user2', follows: 'user1' }).save()
                .then(() => callback())
                .catch(err => callback(err));
            },
            (callback) => {
                FollowModel.build({ username: 'user3', follows: 'user1' }).save()
                .then(() => callback())
                .catch(err => callback(err));
            },
            (callback) => {
                User.getFollowers('user1', (err, followers) => {
                    assert(followers.length == 2, 'there must be exactly 2 followers of user1');
                    assert(typeof(followers.find(follower => follower.username == 'user2')) != 'undefined', 'user 2 should be following user1');
                    assert(typeof(followers.find(follower => follower.username == 'user3')) != 'undefined', 'user 3 should be following user1');
                    assert(typeof(followers.find(follower => follower.username == 'user4')) == 'undefined', 'non-existent follow relationship should not be existent in followers');
                    callback();
                });
            }
        ], err => done(err));
    });
})

describe('User info retrieval tests', (done) => {
    beforeEach(((done) => {
        // create three users
        async.parallel([
            (callback) => {
                createUser('user1', 'user1@domain.com', 'user1password', err => callback(err));
            },
            (callback) => {
                createUser('user2', 'user2@domain.com', 'user2password', err => callback(err));
            },
            (callback) => {
                createUser('user3', 'user3@domain.com', 'user3password', err => callback(err));
            }
        ], (err, result) => {
            done(err);
        });
    }));

    afterEach((done) => {
        teardownDatabase()
        .then(() => done())
        .catch(err => done(err));
    });

    it('Search for users with keyword "user", expect 3 results and proper keys', (done) => {
        User.searchProfile('user', (err, results) => {
            if (err) {
                return done(err);
            }

            userProps = ['username', 'follower_count', 'follow_count', 'picture'];

            assert(results.length == 3, 'expected three results to return from search');
            for (var i = 0; i < results.length; i++) {
                expect(results[i]).to.have.all.keys(userProps);
            }
            done();
        })
    });

    it('Retrieve profile information on user "user2", expect proper keys', (done) => {
        User.getProfile('user2', (err, user) => {
            if (err) {
                return done(err);
            }

            userProps = ['username', 'follower_count', 'follow_count', 'picture'];
            expect(user).to.have.all.keys(userProps);
            done();
        })
    })
})
