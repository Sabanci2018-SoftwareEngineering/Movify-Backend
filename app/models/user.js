var User = require('./DB/user.js');
var User_Activation = require('./DB/user_activation.js');
var User_Follow = require('./DB/user_follow.js');
var User_Forgot = require('./DB/user_forgot.js');

var fs = require('fs');
var path = require('path');
var appDir = path.dirname(require.main.filename);
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
				req.authRes = { err: 'Invalid combination!', res: null };
				callback('Invalid combination!', null);
			} else {
				bcrypt.compare(password, user.password, function(err, res) {
					if (err) { req.authRes = { err: err, res: null }; callback(err, null); }
					if (res) {
						if (!user.isActive) {
							req.authRes = { err: 'Account not active!', res: null };
							callback('Account not active!', null);
						} else {
							req.authRes = { err: null, res: 'Successfully logged in!' };
							callback(null, user);
						}
					} else {
						req.authRes = { err: 'Invalid combination!', res: null };
						callback('Invalid combination!', null);
					}
				});
			}
	})
	.catch((err) => { req.authRes = { err: err, res: null }; callback(err, null); });
}

UserController.registerUser = function (username, email, password, req, callback) {
	var failure = false;

        // 1 - check if registration inputs match expected formats
	if ((typeof(email) === 'undefined') || (email === null) ||
		(typeof(firstname) === 'undefined') || (firstname === null) ||
 		(typeof(lastname) === 'undefined') || (lastname === null) ||
                	!email.match(/.+\@.+\..+/) || !email.match(/(.){1,64}\@(.){1,255}/)) {
			req.authRes = { err: 'Invalid Input', res: null };
			return callback('Invalid Input', null);
	}

	// 2 - check if email exists or not, if the email is nonexistent, create a new account
	User.count({ where: { email: email } }).then((count) => {
		if (count) {
			failure = true;
			req.authRes = { err: 'Email exists', res: null };
                        callback('Email exists', null);
                } else {
                        bcrypt.hash(password, 12, (err, hash) => {
                                if (err) {
                                        console.log(err);
					failure = true; callback(err, null);
					req.authRes = { err: err, res: null };
          			} else {
					User.build({ username: username, email: email, password: hash }).save()
                                                    .then((user) => {
							req.authRes = { err: null, res: 'Successfully registered!' };
							callback(null, user);

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
                        							html: '<h1>Welcome ' + username + ',</h1><p>Here is your activation key: ' + activation_key + ' </p>'
                							}

                							transporter.sendMail(mailOptions, (error, info) => {
                        							if (error) {
                        								console.log(error);
                        							} else {
                                							console.log('Email sent: ' + info.response);
                        							}
                							});

								})
                        					.catch((err) => {
									console.log(err);
									callback(err, null);
									req.authRes = { errr: err, res: null };
								});


						})
                                                .catch((err) => {
							failure = true;
							callback('Username already exists!', null);
							req.authRes = { err: 'Username already exists!', res: null };
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
				callback(null, "successfully activated!");
				user_activation.destroy();

            			User.findOne({ where: { username: username }})
            				.then((user) => {
                				user.isActive = 1;
                				user.save();
            			});
        		} else {
				callback("no such activation key!", null);
        		}
    	})
    	.catch((err) => {
		callback(err, null);
        	console.log(err);
    	});
}

UserController.getProfile = function (username, callback) {
	User.findOne({ where: { username: username } })
    		.then((user) => {
        		if (user) {
            			var resJSON = {
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
                				resJSON.followers = count; callback(null, resJSON);
            			});
        		} else {
            			const err = 'user ' + req.params.targetUsername + ' not found in /profile/:targetUsername';
            			console.log(err);
				callback(err, null);
        		}
    		})
		.catch((err) => {
        		console.log(err);
			callback(err, null);
    		});
}

UserController.getFollowers = function (username, callback) {
	    User_Follow.findAll({ where: { follows: username } })
		.then((user_follow) => {
        		if (user_follow && user_follow.length) {
            			var resJSON = {
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
                          						picture: 'https:\/\/movify.monus.me/pics/'+user.picture
                        					};
					                        resJSON.users.push(userJSON);
                    					} else {
                        					console.log('non-existing follower!');
                    					}
                				})
                				.catch((err) => { console.log(err); });
            			}
				callback(null, resJSON);
        		} else {
            			const err = 'no such user!';
            			console.log(err);
				callback(err, null);
        		}
    		})
    		.catch((err) => { console.log(err); callback(err, null); });
}

UserController.getFollows = function (username, callback) {
	User_Follow.findAll({ where: { username: username } })
		.then((user_follow) => {
        		if (user_follow && user_follow.length) {
            			var resJSON = {
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
                            						picture: 'https:\/\/movify.monus.me/pics/'+user.picture
                        					};
					                        resJSON.users.push(userJSON);
                    					} else {
                        					console.log('non-existing follow!');
                    					}
                				})
                				.catch((err) => { console.log(err); });
            			}
				callback(null, resJSON);
        		} else {
            			const err = 'no such user!';
            			console.log(err);
				callback(err, null);
        		}
    		})
    		.catch((err) => { console.log(err); callback(err, null); });

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
        			user.bio = bio;
    			}
    			if (picture) {
				if (picture == 'delete') user.picture = null;
				else {
					if (Buffer.from(picture, 'base64').toString('base64') === picture) {
						var rawPicture = Buffer.from(picture, 'base64').toString('ascii'); console.log('rawPicture: ' + rawPicture);
						var image_number = '';
                                		for (var i = 0; i < 10; i += 1) image_number += '' + rng();
						fs.stat('%s/public/pics/%s.jpg'%(appDir,image_number), function(err, stats) { console.log(err);
							if (err == null) {
								while (fs.existsSync('%s/public/pics/%s.jpg'%(appDir,image_number))) {
									image_number = '';
                                					for (var i = 0; i < 10; i += 1) image_number += '' + rng();
								}
    							} else { console.log(err); }
							fs.writeFile('%s/public/pics/%s.jpg'%(appDir,image_number), rawPicture, (err) => { console.log(err);
								if (err) {
									console.log(err);
									callback(err, null);
								} else {
									console.log("written %s image"%('%s/public/pics/%s.jpg'%(appDir,image_number)));
									user.picture = image_number;
								}
							}); console.log("end of fs.stat");
						}); console.log("after fs.stat");
					} else {
						return callback("use base64 encoding for picture!", null);
					}
				}
    			}
			if (password) {
				user.password = password;
			}

    			user.save()
    				.then((user) => {
        				if (user) {
            					callback(null, 'successfully updated profile!');
        				} else { //this case is nearly impossible
            					callback("no such user!", null);
        				}
    				})
    				.catch(function (err) { callback(err, null); });
		})
		.catch(function (err) { callback(err, null); });
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
                    				return callback(err, null);
                			} else {
                    				console.log('Email sent: ' + info.response);
                			}
            			});

            			User_Forgot.build({ username: user.username, forgot_key: forgot_key }).save();
            			callback(null, "successful!");
        		} else {
            			callback("no such user!", null);
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

                        					callback("forgot key has been expired", null);
                    					} else {
                        					bcrypt.hash(password, SALT_ROUNDS, (err, hash) => {
                            						if (err) {
                                						callback(err, null);
                            						}
                            						password = hash;
                            						user.password = hash;
									user.save();
                            						user_forgot.destroy();

                            						callback(null, "successfully changed password!");
                        					});
                    					}
                				}
                				// forgot key does NOT exist
                				else {
							callback("no such forgot key!", null);
                				}
            				}).catch((err) => {
                				callback(err, null);
            				});
        			}
        			//  user does NOT exist
        			else {
            				callback("no such user!", null);
        			}
		})
        	.catch((err) => {
            		callback(err, null);
		});
}

module.exports = UserController;
