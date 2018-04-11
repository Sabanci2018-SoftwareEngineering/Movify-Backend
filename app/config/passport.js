var LocalStrategy   = require('passport-local').Strategy;

var Sequelize = require('sequelize')
var User = require('../models/DB/user.js');
var User_Activation = require('../models/DB/user_activation.js')
var rn = require('random-number');
var transporter = require('./transporter.js');
var bcrypt = require('bcrypt');

var rng = rn.generator({
	min: 0,
	max:  9,
	integer: true
});

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
			var email = req.body.email;
			var failure = false;
			
			// 1 - check if registration inputs match expected formats
			if ((typeof(email) === 'undefined') || (email === null) ||
			!email.match(/.+\@.+\..+/) || !email.match(/(.){1,64}\@(.){1,255}/)) {
				return done(null, false, 'Invalid Email');
			}
			
			// 2 - check if email exists or not, if the email is nonexistent, create a new account
			User.count({ where: { email: email } }).then((count) => {
				if (count) {
					done(null, false, 'Email exists');
				}
				else {
					bcrypt.hash(password, 12, (err, hash) => {
						if (err) {
							console.error(err);
						}
						else {
							User.build({ username: username, email: email, password: hash, name: username }).save()
							.then((user) => { done(null, user); })
							.catch((err) => { done(null, false, 'Username already exists!'); })
						}
					});
				}
			});
			
			// 3 - send an email to the user for account activation
			var activation_key = ''
			for (var i = 0; i < 8; i += 1) { 
				activation_key += '' + rng();
			}
			
			User_Activation.build({ username: username, activation_key: activation_key }).save()
			.then((row) => { if (row) console.log("created ua!"); })
			.catch((err) => { console.error(err); });
			
			var mailOptions = {
				from: 'Movify',
				to: email,
				subject: 'Movify Activation Key',
				html: '<h1>Welcome</h1><p>Here is your activation key: ' + activation_key + ' </p>'
			}
			
			transporter.sendMail(mailOptions, (error, info) => {
				if (error) {
					console.error(error);
				} else {
					console.log('Email sent: ' + info.response);
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
			User.findOne({where: { [Sequelize.Op.or]: [ { username: key }, { email: key } ] }})
				.then((user) => {
					if (!user) {
						done(null, false, 'Invalid combination!');
					} else {
						bcrypt.compare(password, user.password, function(err, res) {
							if (res) {
								if (!user.isActive) {
									done(null, false, 'Account not active!');
								} else {
									done(null, user);
								}
							} else {
								done(null, false, 'Invalid combination!');
							}
						});
					}
				})
				.catch((err) => { done(null, false, err); });
		})
	);
};
