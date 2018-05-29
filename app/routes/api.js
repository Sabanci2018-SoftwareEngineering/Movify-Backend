var router = require('express').Router()
var passport = require('passport');
var bcrypt = require('bcrypt');
var transporter = require('../config/transporter.js');
const MovieDB = require('moviedb')('1fe24b6457897c2006951dc44e0d73be');
var async = require('async');
var db = require('../config/database');
var top250 = require('./top250.js');

var UserModel = require('../models/DB/user.js');
var ActivationModel = require('../models/DB/user_activation.js');
var FollowModel = require('../models/DB/user_follow.js');
var ForgotModel = require('../models/DB/user_forgot.js');
var WatchlistModel = require('../models/DB/user_watchlist.js');
var WatchedModel = require('../models/DB/user_watch.js');

var ArtistItem = require('../models/artistItem');
var TitleItem = require('../models/titleItem');
var TitleDetail = require('../models/titleDetail');
var UserItem = require('../models/userItem');

// Generic controllers
var UserController = require('../controllers/user.js');
var TMDB = require('../controllers/movie');

// Instantiate controllers
var tmdb = new TMDB(MovieDB);
var User = new UserController(UserModel, ActivationModel, FollowModel, ForgotModel,
    WatchlistModel, WatchedModel, UserItem, db);


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

var randomTitle = require('random-number').generator({
	min: 0,
	max:  249,
	integer: true
});

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
	User.updateProfile(req.user.username, req.body.picture, req.body.password, req.body.email, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.post('/search/profile', isAuthenticated, (req, res) => {
	User.searchProfile(req.body.keyword, (err, results) => {
		res.json(createResponse(err, results));
	});
});

router.get('/feed/:offset', isAuthenticated, (req, res) => {
    async.waterfall([
        (callback) => {
            User.getFeed(parseInt(req.params.offset), (err, feed) => {
                console.log('FEED\n', feed)
                callback(err, feed);
            });
        },
        (feed, callback) => {
            async.concat(feed, (feedItem, callback) => {
                tmdb.movieInfo(feedItem.title, (err, info) => {
                    if (err) { return callback (err); }

                    callback(null, new TitleItem(info.original_title, info.backdrop_path, 
                        feedItem.title, info.release_date, info.overview, { action_date: feedItem.updatedAt }));
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
router.get('/profile/:username/watched', (req, res) => {
    
    User.getWatchedMovies(req.params.username, (err, watchedMovies) => {
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

router.post('/watched', isAuthenticated, (req, res) => {
    User.addWatchedMovie(req.user.username, req.body.titleID, req.body.rate, req.body.comment, null, (err) => {
        res.json(createResponse(err, "title successfully added"));
    });
});

router.put('/profile/watched', isAuthenticated, (req, res) => {
    User.updateWatchedMovie(req.user.username, req.body.titleID, req.body.rate, req.body.comment, null, (err) => {
	res.json(createResponse(err, "title succesfully edited"));
    });
});

router.delete('/watched', isAuthenticated, (req, res) => {
    User.removeWatchedMovie(req.user.username, req.body.titleID, (err) => {
        res.json(createResponse(err, 'title successfully removed'));
    })
});

router.get('/profile/:targetUsername/watchlist', isAuthenticated, (req, res) => {
    async.waterfall([
        (callback) => { // watchlist of id's
            User.getWatchlist(req.params.targetUsername, (err, watchlist) => {
                callback(err, watchlist);
            });
        },
        (watchlist, callback) => { // populate watchlist fields WRT TitleItem
            async.concat(watchlist, (watchlistItem, callback) => {
                tmdb.movieInfo(watchlistItem.dataValues.title, (err, info) => {
                    if (err) { return callback (err); }
                    var item = new TitleItem(info.original_title,
                        info.poster_path, info.id, info.release_date, info.overview);

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

router.post('/watchlist', isAuthenticated, (req, res) => {
    User.addToWatchlist(req.user.username, req.body.titleID, (err) => {
        res.json(createResponse(err, { addedToWatchlist: true }));
    });
});

router.delete('/watchlist', isAuthenticated, (req, res) => {
    User.removeFromWatchlist(req.user.username, req.body.titleID, (err) => {
        res.json(createResponse(err, { removedFromWatchlist: true }));
    })
});

router.get('/recommended', isAuthenticated, (req, res) => {
    var randomMovie = [top250.items[randomTitle()], top250.items[randomTitle()], top250.items[randomTitle()]];
    var recommendedMovies = [];
    for (var i = 0; i < randomMovie.length; i++) {
        recommendedMovies.push(new TitleItem(randomMovie[i].original_title, randomMovie[i].poster_path, randomMovie[i].id,
            randomMovie[i].release_date, randomMovie[i].overview));
    }
    res.json(createResponse(null, recommendedMovies));

    /* async.waterfall([
        (callback) => {
            User.getWatchedMovies(req.user.username, callback);
        },
        (watched, callback) => {
            var i = 0;
            async.each(watched, (item, callback) => {
                item = item.dataValues;
                console.log('item', i++, '\n', item);
            }, err => {
                callback();
            });
        }
    ], (err, res) => {
        res.json(createResopnse(err, res));
    }); */
})

// MARK: Follow routes
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

router.get('/follows', isAuthenticated, (req, res) => {
    res.redirect('/profile/' + req.user.username + '/follows');
});

router.get('/followers', isAuthenticated, (req, res) => {
    res.redirect('/profile/' + req.user.username + '/followers');
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

// MARK: Movie information retrieval routes
router.get('/title/:targetID', isAuthenticated, (req, res) => {
    async.parallel({
        movieInfo: (callback) => {
            tmdb.movieInfo(req.params.targetID, (err, results) => {
                callback(err, results);
            })
        },
        credits: (callback) => {
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
        else {
            res.json(createResponse(null, new TitleDetail(results.movieInfo.original_title, results.movieInfo.poster_path,
                results.movieInfo.id, results.movieInfo.release_date, results.movieInfo.overview, results.movieInfo.genres,
                results.movieInfo.runtime, results.movieInfo.status, results.movieInfo.tagline, results.movieInfo.vote_average,
                results.movieInfo.vote_count, results.credits.cast, results.credits.crew, results.trailer.youtube, 
             { imdb_id: results.movieInfo.imdb_id })));
        }
    });
});

router.post('/search/title', isAuthenticated, (req, res) => {
    tmdb.searchMovie(req.body.keyword, (err, results) => {
        res.json(createResponse(err, results))
    });
});

router.get('/artist/:targetID', isAuthenticated, (req, res) => {
    async.parallel({
	info: (callback) => {
	    tmdb.artistInfo(req.params.targetID, (err, results) => callback(err, results));
	},
	credits: (callback) => {
	    tmdb.artistCredits(req.params.targetID, (err, results) => callback(err, results));
	},
	images: (callback) => {
	    tmdb.artistImages(req.params.targetID, (err, results) => callback(err, results));
	}
    }, (err, results) => {
	if (err) res.json(createResponse(err));
	else {

	    res.json(createResponse(null, new ArtistItem(results.info.id, results.info.name, results.info.biography,
						results.images.profiles, results.credits.cast)));
	}
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
