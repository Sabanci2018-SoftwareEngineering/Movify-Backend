var fs = require('fs');
var path = require('path');
var appDir = path.dirname(require.main.filename);
var Sequelize = require('sequelize');
var bcrypt = require('bcrypt');
var async = require('async');
var transporter = require('../config/transporter.js');

var UserItem = require('../models/userItem');

var rng = require('random-number').generator({
	min: 0,
	max:  9,
	integer: true
});

class User {
	constructor(userModel, activationModel, followModel, forgotModel,
		watchlistModel, watchedModel, userItem, db) {
		this.userDB = userModel;
		this.activationDB = activationModel;
		this.followDB = followModel;
		this.forgotDB = forgotModel;
		this.watchlistDB = watchlistModel;
		this.watchedDB = watchedModel;
		this.userItem = userItem;

		this.db = db;

		this.recommenderTrained = false;
	}
	
	// MARK: Authentication methods
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
		.catch(err => callback(err));
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
								if (process.env.NODE_ENV == 'PROD') {
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

	forgotPassword(email, callback) {
		this.userDB.findOne({ where: { email: email } })
		.then((user) => {
			if (user) {
				var forgot_key = ''
				for (var i = 0; i < 8; i += 1) forgot_key += '' + rng();
				
				if (process.env.NODE_ENV == 'PROD') {
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

	// MARK: Follow methods
	followUser(username, follows, callback) {
		if (username == follows) {
			return callback('self follow is not permitted!');
		}

		this.db.transaction(t => {
			return this.followDB.create({ 
				username: username,
				follows: follows
			}, { transaction: t }).then(() => {
				return this.userDB.increment('followingCount', {
					where: { username: username },
					transaction: t
				}).then(() => {
					return this.userDB.increment('followerCount', {
						where: { username: follows },
						transaction: t
					});
				});
			});
		})
		.then(() => callback())
		.catch(err => allback(err));
	}

	unfollowUser(username, unfollows, callback) {
		this.db.transaction(t => {
			return this.followDB.destroy({
				where: { username: username, follows: unfollows },
				transaction: t
			}).then(() => {
				return this.userDB.decrement('followingCount', {
					where: { username: username },
					transaction: t
				}).then(() => {
					return this.userDB.decrement('followerCount', {
						where: { username: unfollows},
						transaction: t
					});
				});
			});
		})
		.then(() => callback())
		.catch(err => callback(err));
	}

	getProfile(username, callback) {
		this.userDB.findOne({ where: { username: username } })
		.then((user) => {
			if (!user) {
				return callback('no user with username "' + username + '"');
			}
			callback(null, new this.userItem(user.username, user.followerCount, 
				user.followingCount, user.picture));
		})
		.catch((err) => {
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
						callback(null, new UserItem(user.username,
							user.followerCount, user.followingCount, user.picture));
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
						callback(null, new UserItem(user.username,
							user.followerCount, user.followingCount, user.picture));
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

	// MARK: Watchlist and watched methods
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

	getWatchedMovies(username, callback) {
		this.watchedDB.findAll({ where: { username: username }})
		.then((watchedMovies) => {
			callback(null, watchedMovies);
		})
		.catch(err => {
			return callback(err);
		});
	}

	addWatchedMovie(username, titleID, rate, comment, reason, callback) {
		this.watchedDB.build({ username: username, title: titleID, rate: rate, comment: comment, reason: (reason ? reason : 'other') }).save()
		.then((watched) => {
			return callback(null);
		})
		.catch(err => callback(err));
	}

	updateWatchedMovie(username, titleID, rate, comment, reason, callback) {
		this.watchedDB.findOne({ where: { username: username, title: titleID }})
			.then((watchedMovie) => {
				if (watchedMovie == null) return callback('title is not watched!');

				if (rate != watchedMovie.rate) watchedMovie.rate = rate;
				if (comment != watchedMovie.comment) watchedMovie.comment = comment;
				if ((reason ? reason : 'other') != watchedMovie.reason) watchedMovie.reason = reason;

				watchedMovie.save();

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
	
	// Profile information retrieval and mutation methods
	searchProfile(username, callback) {
		this.userDB.findAll({ where: { username: { $like: '%' + username + '%' } } })
		.then((users) => {
			async.concat(users, (user, callback) => {
				callback(null, new UserItem(user.username, user.followerCount, 
					user.followingCount, user.picture));
			}, (err, results) => {
				callback(err, results);
			});
		})
		.catch(err => callback(err));
	}
	
	updateProfile(username, picture, password, email, callback) {
		this.userDB.findOne({ where: { username: username } })
		.then((user) => {
			async.parallel([
				(callback) => { // password
					if (password) {
						bcrypt.hash(password, 12, (err, pwHash) => {
							if (err) { return callback(err); }
							user.password = pwHash;
							callback();
						});
					}
					else {
						callback();
					}
				},
				(callback) => { // picture
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
					else {
						callback();
					}
				},
				(callback) => { // username
					if (username) {
						user.username = username;
					}
					callback();
				},
				(callback) => { // email
					if (email) {
						user.email = email;
					}
					callback();
				}
			], (err) => {
				if (err) { return callback(err); }

				user.save()
				.then(user => callback(null, user))
				.catch(err => callback(err));
			});
		});
	}

	getFeed(offset, callback) {
		// Utility functions
		function getData(model, callback) { // retrieves all items from provided model
			model.findAll({
				attributes: ['username', 'title', 'updatedAt'],
				order: [['updatedAt', 'DESC']]
			})
			.then(results => {
				results = results.map(results => {
					return Object.assign({}, results.dataValues, {
						type: 'watched'
					});
				});
				callback(null, results);
			})
			.catch(err => callback(err));
		}

		let limit = 10;

		async.parallel([
			(callback) => { // watched
				getData(this.watchedDB, (err, watched) => {
					callback(err, watched);
				});
			},
			(callback) => { // watchlist
				getData(this.watchlistDB, (err, watchlist) => {
					callback(err, watchlist);
				});
			}
		], (err, results) => {
			if (!err && results) {
				results = results[0].concat(results[1]);
				results.sort((a, b) => {
					var keyA = new Date(a.updatedAt);
					var keyB = new Date(b.updatedAt);
					if (keyA > keyB) { return -1; }
					else if (keyA < keyB) { return 1; }
					else { return 0; }
				})
			}
			return callback(err, results.splice(offset, limit));
		});
	}
}

module.exports = User;
