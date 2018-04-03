var LocalStrategy   = require('passport-local').Strategy;

var Sequelize = require('sequelize')
var crypto = require('crypto');
var User = require('../models/user.js');
var User_Activation = require('../models/user_activation.js')
var rn = require('random-number');
var transporter = require('./transporter.js');

var gen = rn.generator({
  	min: 0,
	max:  9,
	integer: true
});

module.exports = function(passport) {
    passport.serializeUser(function(user, done) {
        done(null, user.username);
    });

    passport.deserializeUser(function(username, done) {
	User.findOne({ where: { username: username } }).then(function(user) { done(null, user); });
    });

    passport.use(
        'local-register',
        new LocalStrategy({
            usernameField : 'username',
            passwordField : 'password',
            passReqToCallback : true
        },
        function(req, username, password, done) {
		var email = req.body.email;
		var failure = false;

		if ((typeof(email) === 'undefined') || (email === null) || !email.match(/.+\@.+\..+/) || !email.match(/(.){1,64}\@(.){1,255}/))
			return done(null, false, 'Invalid Email');

		User.count({ where: { email: email } }).then(function(count) {
			if (count) done(null, false, 'Email exists');
			else {
				var shasum = crypto.createHash('sha1');
				shasum.update(password);
				password = shasum.digest('hex');

				User.build({ username: username, email: email, password: password, name: username }).save()
					.then(function(user) { done(null, user); })
					.catch(function(err) { done(null, false, 'Username already exists!'); }
				);
			}
		 });

		var activation_key = ''
		for (var i = 0; i < 8; i += 1) activation_key += '' + gen();

		User_Activation.build({ username: username, activation_key: activation_key }).save()
				.then(function(row) { if (row) console.log("created ua!"); })
				.catch(function(err) { consolle.log(err); }
		);

		var mailOptions = {
 			from: 'Movify',
  			to: email,
  			subject: 'Movify Activation Key',
  			html: '<h1>Welcome</h1><p>Here is your activation key: ' + activation_key + ' </p>'
		}

		transporter.sendMail(mailOptions, function(error, info){
  			if (error) {
    				console.log(error);
  			} else {
    				console.log('Email sent: ' + info.response);
  			}
		});

        })
    );

    passport.use(
        'local-login',
        new LocalStrategy({
            usernameField : 'key',
            passwordField : 'password',
            passReqToCallback : true
        },
        function(req, key, password, done) {
		var shasum = crypto.createHash('sha1');
                shasum.update(password);
                password = shasum.digest('hex');

		User.findOne({where: { [Sequelize.Op.or]: [ { username: key }, { email: key } ], password: password }})
				.then(function(user) { user ?
								user.isActive ?
									done(null, user) : done(null, false, 'not active')
								: done(null, false, 'Invalid combination!'); })
				.catch(function(err) { done(null, false, err); }
		);

        })
    );
};
