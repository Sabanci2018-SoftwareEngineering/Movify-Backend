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

var TitleItem = require('../models/titleItem');
var TitleDetail = require('../models/titleDetail');

// Generic controllers
var UserController = require('../controllers/user.js');
var TMDB = require('../controllers/movie');

// Instantiate controllers
var tmdb = new TMDB(MovieDB);
var User = new UserController(UserModel, ActivationModel, FollowModel, ForgotModel,
    WatchlistModel, WatchedModel);


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

if (process.env.NODE_ENV != 'TEST') {
    router.use('*', (req, res, next) => {
        console.log('[' + req.method + '] ' + req.ip + ' ' + req.path);
        console.log('request parameters: ', req.params);
        console.log('request body: ', JSON.stringify(req.body) + '\n');
        res.setHeader('Content-Type', 'application/json');
        next();
    });
}

// MARK: Authentication related routes
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

router.get('/logout', isAuthenticated, (req, res) => {
	req.session.destroy(function(err) {
        res.clearCookie('connect.sid');
        req.logout();
		res.json(createResponse(err, "successfully logged out!"));
	});
});

// MARK: Profile information and retrieval routes
router.get('/profile', isAuthenticated, (req, res) => {
    res.redirect('/profile/' + req.user.username);
});

router.put('/profile', isAuthenticated, (req, res) => {
	User.updateProfile(req.user.username, req.body.picture, req.body.firstname, req.body.lastname, req.body.bio, req.body.password, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.post('/profile/search', isAuthenticated, (req, res) => {
	User.searchProfile(req.body.keyword, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.get('/feed/:offset', isAuthenticated, (req, res) => {
    async.waterfall([
        (callback) => {
            User.getFeed(0, (err, feed) => {
                callback(err, feed);
            });
        },
        (feed, callback) => {
            async.concat(feed, (feedItem, callback) => {
                tmdb.movieInfo(feedItem.title, (err, info) => {
                    if (err) { return callback (err); }

                    callback(null, new TitleItem(info.original_title, info.backdrop_path, 
                        feedItem.title, info.release_date, overview));
                })
            }, (err, results) => {
                callback(err, results);
            });
        }
    ], (err, results) => {
        res.json(createResponse(err, results));
    })
})

// MARK: Watchlist and watched routes
router.get('/profile/:targetUsername/watched', (req, res) => {
    
    User.getWatchedMovies(req.params.targetUsername, (err, watchedMovies) => {
        if (err) { return res.json(createResponse(err)); }

        async.concat(watchedMovies, (movie, callback) => {
            tmdb.movieInfo(movie.get('title'), (err, movieInfo) => {
                const item = new TitleItem(movieInfo.original_title,
                    movieInfo.poster_path, movie.title, movieInfo.release_date, movieInfo.overview);
                callback(err, item);
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

router.get('/profile/:targetUsername/watchlist', isAuthenticated, (req, res) => {
    async.waterfall([
        (callback) => {
            User.getWatchlist(req.params.targetUsername, (err, watchlist) => {
                callback(err, watchlist);
            });
        },
        (watchlist, callback) => {
            async.concat(watchlist, (watchlistItem, callback) => {
                tmdb.movieInfo(watchlistItem.dataValues.title, (err, info) => {
                    if (err) { return callback (err); }

                    var item = new TitleItem(info.original_title,
                        info.poster_path, info.title, info.release_date, info.overview);

                    callback(null, item);
                })
            }, (err, watchlist) => {
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
});

router.delete('/profile/watchlist', isAuthenticated, (req, res) => {
    User.removeFromWatchlist(req.user.username, req.body.titleID, (err) => {
        res.json(createResponse(err, { removedFromWatchlist: true }));
    })
});

// MARK: Follow routes
router.post('profile/follow', isAuthenticated, (req, res) => {
	User.followUser(req.user.username, req.body.username, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.post('profile/unfollow', isAuthenticated, (req, res) => {
	User.unfollowUser(req.user.username, req.body.username, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.get('/profile/follows', isAuthenticated, (req, res) => {
    res.redirect('/profile/' + req.user.username + '/follows');
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

router.get('/profile/:targetUsername', isAuthenticated, (req, res) => {
	User.getProfile(req.params.targetUsername, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.get('/profile/followers', isAuthenticated, (req, res) => {
    res.redirect('/profile/' + req.user.username + '/followers');
});

// MARK: Movie information retrieval routes
router.get('/title/:targetID', isAuthenticated, (req, res) => {
    async.parallel({
        movieInfo: (callback) => {
            tmdb.movieInfo(req.params.targetID, (err, results) => {
                callback(err, results);
            })
        },
        cast: (callback) => {
            tmdb.movieCredits(req.params.targetID, (err, results) => {
                callback(err, results);
            })
        },
        trailer: (callback) => {
            tmdb.movieTrailer(req.params.targetID, (err, results) => {
                callback(err, results);
            })
        }
    }, (err, results) => {
        if (err) { res.json(createResponse(err)); }
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

router.post('/title/search', isAuthenticated, (req, res) => {
    tmdb.searchMovie(req.body.keyword, (err, results) => {
        res.json(createResponse(err, results))
    });
});

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
