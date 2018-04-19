var User = require('./DB/user.js');
var User_Activation = require('./DB/user_activation.js');
var User_Follow = require('./DB/user_follow.js');
var User_Forgot = require('./DB/user_forgot.js');

var Sequelize = require('sequelize');
var bcrypt = require('bcrypt');
var transporter = require('../config/transporter.js');

var rng = require('random-number').generator({
    min: 0,
    max:  9,
    integer: true
});

var UserController = {};

UserController.loginUser = function (key, password, req, callback) {
	User.findOne({where: { [Sequelize.Op.or]: [ { username: key }, { email: key } ] }})
		.then((user) => {
			if (!user) {
				req.authRes = { stat: false, res: 'Invalid combination!' };
				callback(false, 'Invalid combination!');
			} else {
				bcrypt.compare(password, user.password, function(err, res) {
					if (err) { req.authRes = { stat: false, res: err }; callback(false, err); }
					if (res) {
						if (!user.isActive) {
							req.authRes = { stat: false, res: 'Account not active!' };
							callback(false, 'Account not active!');
						} else {
							req.authRes = { stat: true };
							callback(true, user);
						}
					} else {
						req.authRes = { stat: false, res: 'Invalid combination!' };
						callback(false, 'Invalid combination!');
					}
				});
			}
	})
	.catch((err) => { req.authRes = { stat: false, res: err }; callback(false, err); });
}

UserController.registerUser = function (username, email, firstname, lastname, password, req, callback) {
	var failure = false;

        // 1 - check if registration inputs match expected formats
	if ((typeof(email) === 'undefined') || (email === null) ||
		(typeof(firstname) === 'undefined') || (firstname === null) ||
 		(typeof(lastname) === 'undefined') || (lastname === null) ||
                	!email.match(/.+\@.+\..+/) || !email.match(/(.){1,64}\@(.){1,255}/)) {
			req.authRes = { stat: false, res: 'Invalid Input' };
			return callback(false, 'Invalid Input');
	}

	// 2 - check if email exists or not, if the email is nonexistent, create a new account
	User.count({ where: { email: email } }).then((count) => {
		if (count) {
			console.log(count);
			failure = true;
			req.authRes = { stat: false, res: 'Email exists' };
                        callback(false, 'Email exists');
                } else {
                        bcrypt.hash(password, 12, (err, hash) => {
                                if (err) {
                                        console.error(err);
					failure = true; callback(false, err);
					req.authRes = { stat: false, res: err };
          			} else {
					User.build({ username: username, email: email, password: hash, firstname: firstname, lastname: lastname }).save()
                                                    .then((user) => {
							req.authRes = { stat: true };
							callback(true, user);

							// 3 - send an email to the user for account activation
                					var activation_key = ''
                					for (var i = 0; i < 8; i += 1) {
								activation_key += '' + rng();
                					}

                					User_Activation.build({ username: username, activation_key: activation_key }).save()
								.then((row) => {
									var mailOptions = {
                        							from: 'Movify',
                        							to: email,
                        							subject: 'Movify Activation Key',
                        							html: '<h1>Welcome ' + firstname + ',</h1><p>Here is your activation key: ' + activation_key + ' </p>'
                							}

                							transporter.sendMail(mailOptions, (error, info) => {
                        							if (error) {
                        								console.error(error);
                        							} else {
                                							console.log('Email sent: ' + info.response);
                        							}
                							});

								})
                        					.catch((err) => {
									console.error(err);
									callback(false, err);
									req.authRes = { stat: false, res: err };
								});


						})
                                                .catch((err) => {
							failure = true;
							callback(false, 'Username already exists!');
							req.authRes = { stat: false, res: 'Username already exists!' };
							console.log(err);
						})
                             	}
                       	});
               	}
      	});

	if (failure) return;
}

UserController.activateUser = function (username, key, callback) {
	User_Activation.findOne({ where: { username: username, activation_key: key } })
    		.then((user_activation) => {
        		if (user_activation) {
				callback(true, "success");
				user_activation.destroy();

            			User.findOne({ where: { username: username }})
            				.then((user) => {
                				user.isActive = 1;
                				user.save();
            			});
        		} else {
				callback(false, "no such activation key!");
        		}
    	})
    	.catch((err) => {
		callback(false, err);
        	console.error(err);
    	});
}

UserController.getProfile = function (username, callback) {
	User.findOne({ where: { username: username } })
    		.then((user) => {
        		if (user) {
            			var resJSON = {
                			success: true,
                			username: user.username,
                			firstname: user.firstname,
					lastname: user.lastname,
                			picture: 'https:\/\/movify.monus.me/pics/'+user.picture,
                			bio: user.bio
            			};
            			User_Follow.count({ where: { username: user.username } })
            				.then((count) => {
                				resJSON.follows = count;
            				});
            			User_Follow.count({ where: { follows: user.username } })
            				.then((count) => {
                				resJSON.followers = count; callback(true, resJSON);
            			});
        		} else {
            			const err = 'user ' + req.params.targetUsername + ' not found in /profile/:targetUsername';
            			console.error(err);
				callback(false, err);
        		}
    		})
		.catch((err) => {
        		console.error(err);
			callback(false, err);
    		});
}

UserController.getFollowers = function (username, callback) {
	    User_Follow.findAll({ where: { follows: username } })
		.then((user_follow) => {
        		if (user_follow && user_follow.length) {
            			var resJSON = {
                			success: true,
                			users: []
            			};
            			var length = user_follow.length;
            			for (var i = 0; i < length; i++) {
                			User.findOne({ where: { username: user_follow[i].username } })
                				.then((user) => {
                    					if (user) {
                        					var userJSON = {
                            						username: user.username,
                            						firstname: user.firstname,
									lastname: user.lastname,
									bio: user.bio,
                          						picture: user.picture
                        					};
					                        resJSON.users.push(userJSON);
                    					} else {
                        					console.error('non-existing follower!');
                    					}
                				})
                				.catch((err) => { console.error(err); });
            			}
				callback(true, resJSON);
        		} else {
            			const err = 'no such user!';
            			console.error(err);
				callback(false, err);
        		}
    		})
    		.catch((err) => { console.error(err); callback(false, err); });
}

UserController.getFollows = function (username, callback) {
	User_Follow.findAll({ where: { username: username } })
		.then((user_follow) => {
        		if (user_follow && user_follow.length) {
            			var resJSON = {
                			success: true,
                			users: []
            			};
            			var length = user_follow.length;
            			for (var i = 0; i < length; i++) {
                			User.findOne({ where: { username: user_follow[i].follows } })
                				.then((user) => {
                    					if (user) {
                        					var userJSON = {
                            						username: user.username,
                            						firstname: user.firstname,
									lastname: user.lastname,
									bio: user.bio,
                            						picture: user.picture
                        					};
					                        resJSON.users.push(userJSON);
                    					} else {
                        					console.error('non-existing follow!');
                    					}
                				})
                				.catch((err) => { console.error(err); });
            			}
				callback(true, resJSON);
        		} else {
            			const err = 'no such user!';
            			console.error(err);
				callback(false, err);
        		}
    		})
    		.catch((err) => { console.error(err); callback(false, err); });

}

UserController.updateProfile = function (username, picture, firstname, lastname, bio, password, callback) {
	User.findOne({ where: { username: username } })
		.then((user) => {
    			if (firstname) {
        			user.firstname = firstname;
    			}
			if (lastname) {
				user.lastname = lastname;
			}
    			if (bio) {
        			user.bio = req.body.bio;
    			}
    			if (picture == 'delete') {
        			user.picture = null;
    			}
			if (password) {
				user.password = password;
			}

    			user.save()
    				.then((user) => {
        				if (user) {
            					callback(true, 'successfully updated profile!');
        				} else { //this case is nearly impossible
            					callback(false, "no such user!");
        				}
    				})
    				.catch(function (err) { callback(false, err); });
		})
		.catch(function (err) { callback(false, err); });
}

UserController.forgotPassword = function (email, callback) {
	User.findOne({ where: { email: email } })
		.then((user) => {
        		if (user) {
            			var forgot_key = ''
            			for (var i = 0; i < 8; i += 1) forgot_key += '' + rng();

            			var mailOptions = {
                			from: 'Movify',
                			to: user.email,
                			subject: 'Movify Forgot Password Key',
                			html: '<h1>Dear ' + user.name + ',</h1><p>Here is your forgot password key: ' + forgot_key + ' </p>'
            			}

            			transporter.sendMail(mailOptions, function(err, info){
                			if (err) {
                    				return callback(false, err);
                			} else {
                    				console.log('Email sent: ' + info.response);
                			}
            			});

            			User_Forgot.build({ username: user.username, forgot_key: forgot_key }).save();
            			callback(true, "successful!");
        		} else {
            			callback(false, "no such user!");
        		}
    		})
}

UserController.changePassword = function (email, key, password, callback) {
	User.findOne({ where: { email: email } })
    		.then((user) => {
        		// user exists
        		if (user) {
            			User_Forgot.findOne({ where: { username: user.username, forgot_key: key } })
            				.then((user_forgot) => {
                				// forgot key exists
                				if (user_forgot) {
                    					if (user_forgot.expiry_date <= new Date()) {
                        					user_forgot.destroy();

                        					callback(false, "forgot key has been expired");
                    					} else {
                        					bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
                            						if (err) {
                                						callback(false, err);
                            						}
                            						password = hash;
                            						user.password = hash;
									user.save();
                            						user_forgot.destroy();

                            						callback(true, "successfully changed password!");
                        					});
                    					}
                				}
                				// forgot key does NOT exist
                				else {
							callback(false, "no such forgot key!");
                				}
            				}).catch((err) => {
                				callback(false, err);
            				});
        			}
        			//  user does NOT exist
        			else {
            				callback(false, "no such user!");
        			}
		})
        	.catch((err) => {
            		callback(false, err);
		});
}

module.exports = UserController;
