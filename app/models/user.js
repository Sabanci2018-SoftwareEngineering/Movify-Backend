var User = require('./DB/user.js');
var User_Activation = require('./DB/user_activation.js');
var User_Follow = require('./DB/user_follow.js');
var User_Forgot = require('./DB/user_forgot.js');
var User_Watchlist = require('./DB/user_watchlist.js');
var Accessor = require('./accessor');

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

UserController.loginUser = function (key, password, callback) {
	User.findOne({where: { [Sequelize.Op.or]: [ { username: key }, { email: key } ] }})
	.then((user) => {
		if (!user) {
			return callback('Invalid combination!');
		} else if (user.isActive != 1) {
			return callback('Account not activated!');
		} else {
			bcrypt.compare(password, user.password, function(err, res) {
				if (err) { return callback(false, err); }
				if (res) {
					if (!user.isActive) {
						return callback('Account not active!');
					} else {
						return callback(null, user);
					}
				} else {
					return callback('Invalid combination!');
				}
			});
		}
	})
	.catch((err) => { req.authRes = { err: err, res: null }; callback(err, null); });
}

UserController.registerUser = function (username, email, password, callback) {
	// 1 - check if registration inputs match expected formats
	if ((typeof(email) === 'undefined') || (email === null) ||
	!email.match(/.+\@.+\..+/) || !email.match(/(.){1,64}\@(.){1,255}/)) {
		return callback('Invalid input');
	}
	
	// 2 - check if email exists or not, if the email is nonexistent, create a new account
	User.count({ where: { email: email } }).then((count) => {
		if (count) {
			return callback('Email exists');
		} else {
			bcrypt.hash(password, 12, (err, hash) => {
				if (err) {
					return callback(err);
				} else {
					User.build({ username: username, email: email, password: hash }).save()
					.then((user) => {
						// 3 - send an email to the user for account activation
						var activation_key = ''
						for (var i = 0; i < 8; i += 1) {
							activation_key += '' + rng();
						}
						
						User_Activation.build({ username: username, activation_key: activation_key }).save()
						.then((row) => {
							if (process.env.NODE_ENV != 'DEV') {
								var mailOptions = {
									from: 'Movify',
									to: email,
									subject: 'Movify Activation Key',
									html: '<h1>Welcome ' + username + ',</h1><p>Here is your activation key: ' + activation_key + ' </p>'
								}
								
								transporter.sendMail(mailOptions, (error, info) => {
									if (error) {
										console.error(error);
									} else {
										console.log('Email sent: ' + info.response);
									}
								});
							}
							
							return callback(null, user);
						})
						.catch((err) => {
							return callback(err);
						});
					})
					.catch((err) => {
						return callback('Username already exists!');
					})
				}
			});
		}
	});
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
	});
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

UserController.getWatchlist = function (username, callback) {
	Accessor.getWatchlist(username, (err, watchlist) => {
		return callback(err, watchlist);
	});
}

UserController.addToWatchlist = function (username, titleID, callback) {
	User_Watchlist.count({ where: {username: username, title: titleID }})
	.then((count) => {
		if (count) {
			return callback('item already on watchlist');
		}
		
		User_Watchlist.build({ username: username, title: titleID }).save()
		.then((watchlist) => {
			return callback(null);
		})
		.catch((err) => {
			return callback(err);
		})
	})
	.catch((err) => {
		return callback(err);
	})
}

UserController.removeFromWatchlist = function(username, titleID, callback) {
	User_Watchlist.findOne({ where: {username: username, title: titleID }})
	.then((watchlistItem) => {
		watchlistItem.destroy();
		return callback(null);
	})
	.catch((err) => {
		return callback(err);
	});
}

module.exports = UserController;
