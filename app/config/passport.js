var LocalStrategy   = require('passport-local').Strategy;

var UserModel = require('../models/DB/user.js');
var FollowModel = require('../models/DB/user_follow.js');
var ForgotModel = require('../models/DB/user_forgot.js');
var RecommendModel = require('../models/DB/user_recommend.js');
var WatchModel = require('../models/DB/user_watch.js');
var WatchlistModel = require('../models/DB/user_watchlist.js');
var ActivationModel = require('../models/DB/user_activation.js');

var UserController = require('../controllers/user.js');
var User = new UserController(UserModel, ActivationModel, FollowModel, ForgotModel, WatchlistModel);

module.exports = (passport) => {
	passport.serializeUser((user, done) => {
		done(null, user.username);
	});

	passport.deserializeUser((username, done) => {
		User.getProfile(username, (err, user) => {
			return done(err, user);
		});
	});

	passport.use('local-register',
		new LocalStrategy({
			usernameField : 'username',
			passwordField : 'password',
			passReqToCallback : true
		},
		function(req, username, password, done) {
			User.registerUser(username, req.body.email, password, (err, user) => {
				if (err) {
					console.error(err);
					return done(null, false, { message: err });
				}
				return done(null, user);
			});
		})
	);

	passport.use('local-login',
		new LocalStrategy({
			usernameField : 'key',
			passwordField : 'password',
			passReqToCallback : true
		},
		(req, username, password, done) => {
			User.loginUser(username, password, (err, user) => {
				if (err) { 
					console.error(err); 
					return done(null, false, { message: err }); 
				}
				return done(null, user);
			});
		})
	);
};
