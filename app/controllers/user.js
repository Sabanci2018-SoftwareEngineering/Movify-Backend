var fs = require('fs');
var path = require('path');
var appDir = path.dirname(require.main.filename);
var Sequelize = require('sequelize');
var bcrypt = require('bcrypt');
var async = require('async');
var transporter = require('../config/transporter.js');

var rng = require('random-number').generator({
	min: 0,
	max:  9,
	integer: true
});

class User {
	constructor(userModel, activationModel, followModel, forgotModel,
		watchlistModel, watchedModel) {
		this.userDB = userModel;
		this.activationDB = activationModel;
		this.followDB = followModel;
		this.forgotDB = forgotModel;
		this.watchlistDB = watchlistModel;
		this.watchedDB = watchedModel;
	}
	
	loginUser(key, password, callback) {
		this.userDB.findOne({where: { [Sequelize.Op.or]: [ { username: key }, { email: key } ] }})
		.then((user) => {
			if (!user) {
				return callback('Invalid combination!');
			} else if (user.isActive != 1) {
				return callback('Account not activated!');
			} else {
				bcrypt.compare(password, user.password, function(err, res) {
					if (err) {
						return callback(err);
					} else if (res) {
						return callback(null, user);
					} else {
						return callback('Invalid combination!');
					}
				});
			}
		})
		.catch((err) => { req.authRes = { err: err, res: null }; callback(err); });
	}
	
	registerUser (username, email, password, callback) {
		// 1 - check if registration inputs match expected formats
		if ((typeof(email) === 'undefined') || (email === null) ||
		!email.match(/.+\@.+\..+/) || !email.match(/(.){1,64}\@(.){1,255}/)) {
			return callback('Invalid input');
		}
		
		// 2 - check if email exists or not, if the email is nonexistent, create a new account
		this.userDB.count({ where: { email: email } }).then((count) => {
			if (count) {
				return callback('Email exists');
			} else {
				bcrypt.hash(password, 12, (err, hash) => {
					if (err) {
						return callback(err);
					} else {
						this.userDB.build({ username: username, email: email, password: hash }).save()
						.then((user) => {
							// 3 - send an email to the user for account activation
							var activation_key = ''
							for (var i = 0; i < 8; i += 1) {
								activation_key += '' + rng();
							}
							
							this.activationDB.build({ username: username, activation_key: activation_key }).save()
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

	activateUser(username, key, callback) {
		this.activationDB.findOne({ where: { username: username, activation_key: key } })
		.then((user_activation) => {
			if (user_activation) {
				user_activation.destroy();

				this.userDB.findOne({ where: { username: username }})
				.then((user) => {
					user.isActive = 1;
					user.save();
					return callback(null, "success");
				});
			} else {
				return callback("no such activation key!");
			}
		})
		.catch((err) => {
			return callback(err);
			console.error(err);
		});
	}

	followUser(username, follows, callback) {
		if (username == follows) {
			return callback('self follow is not permitted!');
		}
		this.userDB.findOne({ where: { username: follows } })
		.then((user) => {
			if (user) {
				this.followDB.findOne({ where: { username: username, follows: follows}})
				.then((followEntry) => {
					if (followEntry) {
						return callback('already following');
					}
					this.followDB.build({ username: username, follows: follows }).save()
					.then((follow) => {
						if (follow) callback(null, "success");
					}).catch(err => callback(err));
				})
				.catch(err => callback(err));
			} else {
				callback("no such user!");
			}
		})
		.catch(err => callback(err));
	}

	unfollowUser(username, unfollows, callback) {
		this.followDB.findOne({ where: { username: username, follows: unfollows } })
		.then((follow) => {
			if (follow) {
				callback(null, "success");
				follow.destroy();
			} else {
				callback("not even follows!");
			}
		})
		.catch(err => callback(err));
	}

	searchProfile(username, callback) {
		this.userDB.findAll({ where: { username: { $like: '%' + username + '%' } } })
		.then((users) => {
			var resJSON = {
				users: []
                        };
			if (users && users.length) {
				var length = users.length;
				for (var i = 0; i < length; i++) {
					resJSON.users.push({ username: users[i].username, picture: 'https:\/\/movify.monus.me/pics/'+users[i].picture });
				}
			}
			callback(null, resJSON);
		})
		.catch(err => callback(err));
	}

	getProfile(username, callback) {
		this.userDB.findOne({ where: { username: username } })
		.then((user) => {
			if (user) {
				var resJSON = {
					username: user.username,
					firstname: user.firstname,
					lastname: user.lastname,
					picture: 'https:\/\/movify.monus.me/pics/'+user.picture,
					bio: user.bio
				};
				this.followDB.count({ where: { username: user.username } })
				.then((count) => {
					resJSON.follows = count;
				});
				this.followDB.count({ where: { follows: user.username } })
				.then((count) => {
					resJSON.followers = count; callback(null, resJSON);
				});
			} else {
				const err = 'user ' + req.params.targetUsername + ' not found in /profile/:targetUsername';
				console.log(err);
				callback(err);
			}
		})
		.catch((err) => {
			console.log(err);
			callback(err);
		});
	}

	getFollowers(username, callback) {
		this.followDB.findAll({ where: { follows: username } })
		.then((user_follow) => {
			async.concat(user_follow, (follow, callback) => {
				this.userDB.findOne({ where: { username: follow.username } })
				.then((user) => {
					if (user) {
						callback(null, {
							username: user.username,
							firstname: user.firstname,
							lastname: user.lastname,
							bio: user.bio,
							picture: 'https:\/\/movify.monus.me/pics/'+user.picture
						});
					} else {
						callback('non-existing follower!');
					}
				})
				.catch((err) => { callback(err) });
			}, (err, results) => {
				callback(err, results);
			});
		})
	}

	getFollows(username, callback) {
		this.followDB.findAll({ where: { username: username } })
		.then((user_follow) => {
			async.concat(user_follow, (follow, callback) => {
				this.userDB.findOne({ where: { username: follow.follows } })
				.then((user) => {
					if (user) {
						callback(null, {
							username: user.username,
							firstname: user.firstname,
							lastname: user.lastname,
							bio: user.bio,
							picture: 'https:\/\/movify.monus.me/pics/'+user.picture
						});
					} else {
						callback('non-existing follow!');
					}
				})
				.catch((err) => { callback(err) });
			}, (err, results) => {
				callback(err, results);
			});
		})
	}

	updateProfile(username, picture, firstname, lastname, bio, password, callback) {
		this.userDB.findOne({ where: { username: username } })
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
			if (picture == 'delete') {
				user.picture = null;
			}
			if (password) {
				user.password = password;
			}
			user.save()
			.then((user) => {
				if (user) {
					callback(null, 'successfully updated profile!');
				} else { //this case is nearly impossible
					callback("no such user!");
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
								} else { console.error(err); }
								fs.writeFile('%s/public/pics/%s.jpg'%(appDir,image_number), rawPicture, (err) => { console.log(err);
									if (err) {
										console.error(err);
										return callback(err);
									} else {
										console.error("written %s image"%('%s/public/pics/%s.jpg'%(appDir,image_number)));
										user.picture = image_number;
									}
								}); console.log("end of fs.stat");
							}); console.log("after fs.stat");
						} else {
							return callback("use base64 encoding for picture!");
						}
					}
				}
				if (password) {
					user.password = password;
				}
				
				user.save()
				.then((user) => {
					if (user) {
						return callback(null, 'successfully updated profile!');
					} else { //this case is nearly impossible
						return callback("no such user!");
					}
				})
				.catch(function (err) { return callback(err); });
			})
			.catch(function (err) { return callback(err); });
		});
	}

	forgotPassword(email, callback) {
		this.userDB.findOne({ where: { email: email } })
		.then((user) => {
			if (user) {
				var forgot_key = ''
				for (var i = 0; i < 8; i += 1) forgot_key += '' + rng();
				
				if (process.env.NODE_ENV != 'DEV') {
					var mailOptions = {
						from: 'Movify',
						to: user.email,
						subject: 'Movify Forgot Password Key',
						html: '<h1>Dear ' + user.name + ',</h1><p>Here is your forgot password key: ' + forgot_key + ' </p>'
					}
				
					transporter.sendMail(mailOptions, function(err, info){
						if (err) {
							console.error(err);
						} else {
							console.log('Email sent: ' + info.response);
						}
					});
				}
				var date = new Date(); date.setDate(date.getDate() + 7);
				this.forgotDB.build({ username: user.username, forgot_key: forgot_key, expiry_date: date }).save();
				callback(null, "successful!");
			} else {
				callback("no such user!");
			}
		}).catch(err => callback(err));
	}

	changePassword(email, key, password, callback) {
		this.userDB.findOne({ where: { email: email } })
		.then((user) => {
			// user exists
			if (user) {
				this.forgotDB.findOne({ where: { username: user.username, forgot_key: key } })
				.then((user_forgot) => {
					// forgot key exists
					if (user_forgot) {
						var now = new Date();
						if (user_forgot.expiry_date <= now) {
							user_forgot.destroy();
							
							callback("forgot key has been expired");
						} else {
							bcrypt.hash(password, 12, (err, hash) => {
								if (err) {
									callback(err);
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
						callback("no such forgot key!");
					}
				}).catch((err) => {
					callback(err);
				});
			}
			//  user does NOT exist
			else {
				callback("no such user!");
			}
		})
		.catch((err) => {
			callback(err);
		});
	}

	getWatchlist(username, callback) {
		this.watchlistDB.findAll({ where: { username: username} })
		.then((watchlist) => {
			if (!watchlist) {
				return callback("user " + username + " does not have a watchlist");
			}
			return callback(null, watchlist);
		})
		.catch((err) => {
			return callback(err);
		});
	}

	addToWatchlist(username, titleID, callback) {
		this.watchlistDB.count({ where: {username: username, title: titleID }})
		.then((count) => {
			if (count) {
				return callback('item already on watchlist');
			}
			
			this.watchlistDB.build({ username: username, title: titleID }).save()
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

	removeFromWatchlist(username, titleID, callback) {
		this.watchlistDB.findOne({ where: {username: username, title: titleID }})
		.then((watchlistItem) => {
			if (watchlistItem) {
				watchlistItem.destroy()
				.then(() => {
					return callback(null);
				})
				.catch(err => callback(err));
			}
			else {
				return callback('watchlist item {username: ' + username + ', title: ' + titleID + ' does not exist!');
			}
			
		})
		.catch((err) => {
			return callback(err);
		});
	}

	addWatchedMovie(username, titleID, reason, callback) {
		this.watchedDB.build({ username: username, title: titleID, reason: (reason ? reason : 'other') }).save()
		.then((watched) => {
			return callback(null);
		})
		.catch(err => callback(err));
	}

	removeWatchedMovie(username, titleID, callback) {
		this.watchedDB.findOne({ where: { username: username, title: titleID }})
		.then((watched) => {
			if (!watched) {
				return callback('title is not watched!');
			}
			watched.destroy()
			.then(() => {
				callback(null);
			})
			.catch(err => callback(err));
		});
	}

	getWatchedMovies(username, callback) {
		this.watchedDB.findAll({ where: { username: username }})
		.then((watchedMovies) => {
			callback(null, watchedMovies);
		})
		.catch(err => {
			return callback(err);
		});
	}

	getFeed(offset, callback) {
		async.parallel([
			(callback) => {
				this.watchedDB.findAll({
					attributes: ['username', 'title', 'updatedAt'],
				})
				.then((watchedArray) => {
					watchedArray = watchedArray.map(watchedArray => {
						return Object.assign({}, watchedArray.dataValues, {
							type: "watched"
						});
					})
					callback(null, watchedArray);
				})
				.catch(err => callback(err));
			},
			(callback) => {
				this.watchlistDB.findAll({
					attributes: ['username', 'title', 'updatedAt'],
				})
				.then((watchlistArray) => {
					watchlistArray = watchlistArray.map(watchlistItem => {
						return Object.assign({}, watchlistItem.dataValues, {
							type: "watchlist"
						});
					})
					callback(null, watchlistArray);
				})
				.catch(err => callback(err));
			}
		], (err, results) => {
			results = results[0].concat(results[1]);
			results.sort((a, b) => {
				var keyA = new Date(a.updatedAt);
				var keyB = new Date(b.updatedAt);
				if (keyA > keyB) { return -1; }
				else if (keyA < keyB) { return 1; }
				else { return 0; }
			})
			return callback(err, results);
		})

		
	}
}

module.exports = User;
