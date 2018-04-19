var router = require('express').Router()
var Sequelize = require('sequelize');
var passport = require('passport');
var bcrypt = require('bcrypt');
var transporter = require('../config/transporter.js');
const MovieDB = require('moviedb')('52d83a93b06d28b814fd3ab6f12bcc2a');

var UserController = require('../models/user.js');

var User = require('../models/DB/user.js');
var User_Activation = require('../models/DB/user_activation.js');
var User_Follow = require('../models/DB/user_follow.js');
var User_Forgot = require('../models/DB/user_forgot.js');
var TMDB = require('../models/movie');

var rng = require('random-number').generator({
    min: 0,
    max:  9,
    integer: true
});

const SALT_ROUNDS = 12;

var tmdb = new TMDB(MovieDB);

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
	if (req.authRes.stat) {
		res.status(200);
		res.json(createResponse(null, 'succesfully logged in'));
	} else {
		res.status(401);
		res.json(createResponse(req.authRes.res));
	}
});

router.post('/register', passport.authenticate('local-register'), (req, res) => {
	if (req.authRes.stat) {
		res.removeHeader('set-cookie'); console.log(res.headers);
		res.status(200);
		res.json(createResponse(null, 'successfully registered!'));
	} else {
		res.status(401);
		res.json(createResponse(req.authRes.res));
	}
});

router.post('/activate/:targetUsername', (req, res) => {
	UserController.activateUser(req.params.targetUsername, req.body.activation_key, (stat, err) => {
		res.json(createResponse(!stat, err));
	});
});

router.post('/forgot/:key', (req, res) => {
	UserController.changePassword(req.body.email, req.params.key, req.body.password, (stat, err) => {
		res.json(createResponse(!stat, err));
	});
});

router.post('/forgot', (req, res) => {
	UserController.forgotPassword(req.body.email, (stat, err) => {
		res.json(createResponse(!stat, err));
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

router.get('/profile', isAuthenticated, (req, res) => {
    res.redirect('/profile/' + req.user.username);
});

router.get('/profile/follows', isAuthenticated, (req, res) => {
    res.redirect('/profile/' + req.user.username + '/follows');
});

router.get('/profile/followers', isAuthenticated, (req, res) => {
    res.redirect('/profile/' + req.user.username + '/followers');
});

router.get('/profile/:targetUsername/follows', isAuthenticated, (req, res) => {
	UserController.getFollows(req.params.targetUsername, (stat, result) => {
		res.json(createResponse(!stat, result));
	});
});

router.get('/profile/:targetUsername/followers', isAuthenticated, (req, res) => {
	UserController.getFollowers(req.params.targetUsername, (stat, result) => {
		res.json(createResponse(!stat, result));
	});
});

router.get('/profile/:targetUsername', isAuthenticated, (req, res) => {
	UserController.getProfile(req.params.targetUsername, (stat, result) => {
		res.json(createResponse(!stat, result));
	});
});

router.put('/profile', isAuthenticated, (req, res) => {
	UserController.updateProfile(req.user.username, req.body.picture, req.body.firstname, req.body.lastname, req.body.bio, req.body.password, (stat, result) => {
		res.json(createResponse(!stat, result));
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
