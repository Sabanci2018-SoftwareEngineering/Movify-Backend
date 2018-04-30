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

router.post('/login', passport.authenticate('local-login'), (req, res) => {
    if (req.isAuthenticated()) {
        return res.json(createResponse(null, { loginSuccess: 'successfully logged in'}));
    }
    return res.status(401).json(createResponse(null, { loginSuccess: 'could not login for some reason'}));
});

router.post('/register', passport.authenticate('local-register'), (req, res) => {
    if (req.isAuthenticated()) {
        res.json(createResponse(null, { registrationSuccess: true }));
    } else {
        res.json(createResponse(null, { registrationSuccess: false }));
    }
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

router.post('/profile/search', (req, res) => {
	User.searchProfile(req.body.keyword, (err, results) => {
		res.json(createResponse(err, results));
	});
}); 

router.post('/search', (req, res) => {
    tmdb.searchMovie(req.body.keyword, (err, results) => {
        res.json(createResponse(err, results))
    });
});

router.get('/title/:targetID', (req, res) => {
    tmdb.movieInfo(req.params.targetID, (err, results) => {
        res.json(createResponse(err, results));
    });
});

router.get('/title/:targetID/trailer', (req, res) => {
    tmdb.movieTrailer(req.params.targetID, (err, results) => {
        res.json(createResponse(err, results.youtube));
    });
});

router.get('/title/:targetID/credits', (req, res) => {
    tmdb.movieCredits(req.params.targetID, (err, results) => {
        res.json(createResponse(err, results));
    });
});

// MARK: AUTHENTICATED ROUTES

router.get('/logout', isAuthenticated, (req, res) => {
	req.session.destroy(function(err) {
		res.clearCookie('connect.sid');
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
    User.getWatchlist(req.params.targetUsername, (err, watchlist) => {
        res.json(createResponse(err, watchlist));
    });
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
            console.log('currently retrieving info on movie: ', movie.get('title'));
            tmdb.movieInfo(movie.get('title'), (err, movieInfo) => {
                console.log('info:', movieInfo);
                callback(err, {
                    name: movieInfo.original_title,
                    image: movieInfo.backdrop_path,
                    id: movie.get('title')
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
