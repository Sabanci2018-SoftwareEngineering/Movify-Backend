var LocalStrategy   = require('passport-local').Strategy;

var User = require('../models/DB/user.js');
var UserController = require('../models/user.js');

module.exports = (passport) => {
	passport.serializeUser((user, done) => {
		done(null, user.username);
	});

	passport.deserializeUser((username, done) => {
		User.findOne({ where: { username: username } })
		.then((user) => { done(null, user); });
	});

	passport.use('local-register',
		new LocalStrategy({
			usernameField : 'username',
			passwordField : 'password',
			passReqToCallback : true
		},
		function(req, username, password, done) {
			UserController.registerUser(username, req.body.email, req.body.firstname, req.body.lastname, password, req, (stat, res) => {
				if (stat) {
					done(null, res);
					console.log('register success: ' + res);
				} else {
					done(null, false, res);
					console.log('register error: ' + res);
				}
			});
		})
	);

	passport.use('local-login',
		new LocalStrategy({
			usernameField : 'key',
			passwordField : 'password',
			passReqToCallback : true
		},
		(req, key, password, done) => {
			UserController.loginUser(key, password, req, (stat, res) => {
				if (stat) {
					done(null, res);
					console.log('login success: ' + res);
				} else {
					done(null, false, res);
					console.log('login error: ' + res);
				}
			});
		})
	);
};
