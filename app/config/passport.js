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
			UserController.registerUser(username, req.body.email, req.body.firstname, req.body.lastname, password, req, (err, res) => {
				if (err) {
					done(null, false, err);
					console.log('register error: ' + err);
				} else {
					done(null, res);
					console.log('register success: ' + res);
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
			UserController.loginUser(key, password, req, (err, res) => {
				if (err) {
					done(null, false, err);
					console.log('login error: ' + err);
				} else {
					done(null, res);
					console.log('login success: ' + res);
				}
			});
		})
	);
};
