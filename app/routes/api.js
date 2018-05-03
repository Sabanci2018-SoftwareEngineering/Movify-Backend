var router = require('express').Router()
var Sequelize = require('sequelize');
var passport = require('passport');
var bcrypt = require('bcrypt');
var transporter = require('../config/transporter.js');
const MovieDB = require('moviedb')('52d83a93b06d28b814fd3ab6f12bcc2a');
var async = require('async');

var UserModel = require('../models/DB/user.js');
var ActivationModel = require('../models/DB/user_activation.js');
var FollowModel = require('../models/DB/user_follow.js');
var ForgotModel = require('../models/DB/user_forgot.js');
var WatchlistModel = require('../models/DB/user_watchlist.js');
var WatchedModel = require('../models/DB/user_watch.js');

var Title = require('../models/title');

// Generic controllers
var UserController = require('../controllers/user.js');
var TMDB = require('../controllers/movie');

var rng = require('random-number').generator({
    min: 0,
    max:  9,
    integer: true
});

const SALT_ROUNDS = 12;

// Instantiate controllers
var tmdb = new TMDB(MovieDB);
var User = new UserController(UserModel, ActivationModel, FollowModel, ForgotModel,
    WatchlistModel, WatchedModel);

if (process.env.NODE_ENV != 'test') {
    router.use('*', (req, res, next) => {
        console.log('[' + req.method + '] ' + req.ip + ' ' + req.path)
        console.log('request parameters: ', req.params)
        console.log('request body: ', JSON.stringify(req.body) + '\n');
        res.setHeader('Content-Type', 'application/json');
        next();
    });
}

function createResponse(err, res) {
    if (err) {
        return {
            success: false,
            error: err
        };
    }
    return {
        success: true,
        results: res
    };
}

// MARK: PUBLIC ROUTES

router.post('/login', (req, res, next) => {
    passport.authenticate('local-login', (err, user, info) => {
        if (err) {
            res.status(401).json(createResponse(err, { loginSuccess: false }));
        }
        else {
            req.login(user, (err) => {
                res.json(createResponse(err, { loginSuccess: true }));
            })   
        }
    })(req, res, next); 
});

router.post('/register', (req, res, next) => {
    passport.authenticate('local-register', (err, user, info) => {
        return res.json(createResponse(err, { registrationSuccessful: true }));
    })(req, res, next);
});

router.post('/activate/:targetUsername', (req, res) => {
	User.activateUser(req.params.targetUsername, req.body.activation_key, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.post('/forgot/:key', (req, res) => {
	User.changePassword(req.body.email, req.params.key, req.body.password, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.post('/forgot', (req, res) => {
	User.forgotPassword(req.body.email, (err, results) => {
		res.json(createResponse(err, results));
	});
});

// MARK: AUTHENTICATED ROUTES

router.post('/profile/search', isAuthenticated, (req, res) => {
	User.searchProfile(req.body.keyword, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.post('/search', isAuthenticated, (req, res) => {
    tmdb.searchMovie(req.body.keyword, (err, results) => {
        res.json(createResponse(err, results))
    });
});

router.get('/title/:targetID', isAuthenticated, (req, res) => {
    tmdb.movieInfo(req.params.targetID, (err, results) => {
        res.json(createResponse(err, results));
    });
});

router.get('/title/:targetID/trailer', isAuthenticated, (req, res) => {
    tmdb.movieTrailer(req.params.targetID, (err, results) => {
        res.json(createResponse(err, results.youtube));
    });
});

router.get('/title/:targetID/credits', isAuthenticated, (req, res) => {
    tmdb.movieCredits(req.params.targetID, (err, results) => {
        res.json(createResponse(err, results));
    });
});

router.get('/logout', isAuthenticated, (req, res) => {
	req.session.destroy(function(err) {
        res.clearCookie('connect.sid');
        req.logout();
		res.json(createResponse(err, "successfully logged out!"));
	});
});

router.post('/follow', isAuthenticated, (req, res) => {
	User.followUser(req.user.username, req.body.username, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.post('/unfollow', isAuthenticated, (req, res) => {
	User.unfollowUser(req.user.username, req.body.username, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.get('/profile', isAuthenticated, (req, res) => {
    res.redirect('/profile/' + req.user.username);
});

router.put('/profile', isAuthenticated, (req, res) => {
	User.updateProfile(req.user.username, req.body.picture, req.body.firstname, req.body.lastname, req.body.bio, req.body.password, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.get('/profile/:targetUsername/watchlist', isAuthenticated, (req, res) => {
    async.waterfall([
        (callback) => {
            User.getWatchlist(req.params.targetUsername, (err, watchlist) => {
                callback(err, watchlist);
            });
        },
        (watchlist, callback) => {
            async.each(watchlist, (watchlistItem, callback) => {
                itemData = watchlistItem.dataValues;
                
                tmdb.movieInfo(watchlistItem.dataValues.title, (err, info) => {
                    if (err) { return callback (err); }
                    

                    watchlistItem.dataValues.original_title = info.original_title,
                    watchlistItem.dataValues.poster_path = info.backdrop_path
                    watchlistItem.dataValues.titleID = watchlistItem.title;
                    watchlistItem.dataValues.releaseDate = info.release_date,
                    delete watchlistItem.dataValues.title;
                    callback();
                })
            }, (err) => {
                callback(err, watchlist);
            });
        }
    ], (err, results) => {
        res.json(createResponse(err, results));
    })
});

router.post('/profile/watchlist', isAuthenticated, (req, res) => {
    User.addToWatchlist(req.user.username, req.body.titleID, (err) => {
        res.json(createResponse(err, { addedToWatchlist: true }));
    });
})

router.delete('/profile/watchlist', isAuthenticated, (req, res) => {
    User.removeFromWatchlist(req.user.username, req.body.titleID, (err) => {
        res.json(createResponse(err, { removedFromWatchlist: true }));
    })
})

router.get('/profile/follows', isAuthenticated, (req, res) => {
    res.redirect('/profile/' + req.user.username + '/follows');
});

router.get('/profile/followers', isAuthenticated, (req, res) => {
    res.redirect('/profile/' + req.user.username + '/followers');
});

router.get('/profile/:targetUsername', isAuthenticated, (req, res) => {
	User.getProfile(req.params.targetUsername, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.get('/profile/:targetUsername/follows', isAuthenticated, (req, res) => {
	User.getFollows(req.params.targetUsername, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.get('/profile/:targetUsername/followers', isAuthenticated, (req, res) => {
	User.getFollowers(req.params.targetUsername, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.get('/profile/:targetUsername/watched', (req, res) => {
    
    User.getWatchedMovies(req.params.targetUsername, (err, watchedMovies) => {
        if (err) { return res.json(createResponse(err)); }

        async.concat(watchedMovies, (movie, callback) => {
            tmdb.movieInfo(movie.get('title'), (err, movieInfo) => {
                callback(err, {
                    original_title: movieInfo.original_title,
                    poster_path: movieInfo.backdrop_path,
                    titleID: movie.get('title'),
                    releaseDate: movie.get('releaseDate')
                });
            });
        }, (err, results) => {
            res.json(createResponse(err, results));
        });
    })
});

router.post('/profile/watched', isAuthenticated, (req, res) => {
    User.addWatchedMovie(req.user.username, req.body.titleID, null, (err) => {
        res.json(createResponse(err, "title successfully added"));
    });
});

router.delete('/profile/watched', isAuthenticated, (req, res) => {
    User.removeWatchedMovie(req.user.username, req.body.titleID, (err) => {
        res.json(createResponse(err, 'title successfully removed'));
    })
});

router.get('/feed/:offset', isAuthenticated, (req, res) => {
    async.waterfall([
        (callback) => {
            User.getFeed(0, (err, feed) => {
                callback(err, feed);
            });
        },
        (feed, callback) => {
            async.each(feed, (feedItem, callback) => {

                tmdb.movieInfo(feedItem.title, (err, info) => {
                    if (err) { return callback (err); }
                    
                    feedItem.original_title = info.original_title,
                    feedItem.poster_path = info.backdrop_path
                    feedItem.titleID = feedItem.title;
                    feedItem.releaseDate = info.release_date,
                    delete feedItem.title;
                    callback();
                })
            }, (err) => {
                callback(err, feed);
            });
        }
    ], (err, results) => {
        res.json(createResponse(err, results));
    })
})


router.all('*', (req, res) => {
    res.status(404);
    res.json({
        error: 'Invalid request'
    })
});

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated())
    return next();
    res.status(401);
    res.json({
        error: "Not authenticated!"
    });
}

module.exports = router;
