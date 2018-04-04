var router = require('express').Router()
var Sequelize = require('sequelize');
var passport = require('passport');
var bcrypt = require('bcrypt');
var transporter = require('../config/transporter.js');
const MovieDB = require('moviedb')('52d83a93b06d28b814fd3ab6f12bcc2a');

var User = require('../models/DB/user.js');
var User_Activation = require('../models/DB/user_activation.js');
var User_Follow = require('../models/DB/user_follow.js');
var User_Forgot = require('../models/DB/user_forgot.js');
var TMDB = require('../models/movie');

var rng = require('random-number').generator({
    min: 0,
    max:  9,
    integer: true
});

const SALT_ROUNDS = 12;

var tmdb = new TMDB(MovieDB);

if (process.env.NODE_ENV != 'test') {
    router.use('*', (req, res, next) => {
        console.log('[' + req.method + '] ' + req.ip + ' ' + req.path)
        console.log('request parameters: ', req.params)
        console.log('request body: ', JSON.stringify(req.body) + '\n');
        res.setHeader('Content-Type', 'application/json');
        next();
    });
}

function createResponse(err, res) {
    if (err) {
        return {
            success: false,
            error: err
        };
    }
    return {
        success: true,
        results: res
    };
}

// MARK: PUBLIC ROUTES

router.post('/login', passport.authenticate('local-login', {
        successRedirect : '/feed'
    }),
    (req, res) => {
        if (req.body.remember) {
            req.session.cookie.maxAge = 1000 * 60 * 3;
        } else {
            req.session.cookie.expires = false;
        }
    }
);

router.post('/register', passport.authenticate('local-register', {
        successRedirect : '/profile'
    })
);

router.post('/activate/:targetUsername', (req, res) => {
    User_Activation.findOne({ where: { username: req.params.targetUsername, activation_key: req.body.activation_key } })
    .then((user_activation) => {
        if (user_activation) {
            res.status(200);
            res.json({ success: true, msg: 'successful activation!' });
            user_activation.destroy();

            User.findOne({ where: { username: req.params.targetUsername }})
            .then((user) => { 
                user.isActive = 1; 
                user.save(); 
            });
        } else {
            res.status(400);
            res.json({ success: false, msg: 'no such activation key!' });
        }
    })
    .catch((err) => { 
        console.error(err); 
    });
});

router.post('/forgot/:targetUsername/:targetKey', (req, res) => {
    User.findOne({ where: { username: req.params.targetUsername } })
    .then((user) => {
        // user exists
        if (user) {
            User_Forgot.findOne({ where: { username: user.username, forgot_key: req.params.targetKey } })
            .then((user_forgot) => {
                // forgot key exists
                if (user_forgot) {
                    if (user_forgot.expiry_date <= new Date()) {
                        user_forgot.destroy();
                        
                        res.status(400);
                        res.json({ success: false, msg: 'forgot key has been expired' });
                    } else {
                        bcrypt.hash(req.body.password, SALT_ROUNDS, (err, hash) => {
                            if (err) {
                                console.error(err);
                                res.status(500);
                                res.json({
                                    success: false,
                                    error: err
                                });
                            }
                            req.body.password = hash;
                            user.password = hash;
                            user.save();
                            user_forgot.destroy();

                            res.status(200);
                            res.json({ 
                                success: true, 
                                msg: 'successfully changed password!' 
                            });
                        });
                    }
                } 
                // forgot key does NOT exist
                else {
                    res.status(400);
                    res.json({ success: false, 
                        msg: 'no such forgot key!'
                    });
                }
            }).catch((err) => {
                console.error(err);
                res.status(500);
                res.json({
                    success: false,
                    error: err
                });
            });
        } 
        //  user does NOT exist
        else {
            res.status(400);
            res.json({ success: false, msg: 'no such user!' });
        }})
        .catch((err) => { 
            console.error(err);
            res.status()
        });
});

router.post('/forgot', (req, res) => {
    User.findOne({ where: { username: req.body.username, email: req.body.email } })
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
                    console.error(err);
                    res.status(500);
                    return res.json(createResponse(err));
                } else {
                    console.log('Email sent: ' + info.response);
                }
            });

            User_Forgot.build({ username: user.username, forgot_key: forgot_key }).save();
            res.status(200);
            res.json({ success: true, msg: 'successful!' });
        } else {
            res.status(400);
            res.json({ success: false, msg: 'no such user!' });
        }
    })
    .catch((err) => { 
        console.error(err);
        return res.json(createResponse(err));
    });
});

router.post('/search', (req, res) => {
    tmdb.searchMovie(req.body.keyword, (err, results) => {
        res.json(createResponse(err, results))
    })
});

router.get('/title/:targetID', (req, res) => {
    tmdb.movieInfo(req.params.targetID, (err, results) => {
        res.json(createResponse(err, results));
    });
});

router.get('/title/:targetID/trailer', (req, res) => {
    tmdb.movieTrailer(req.params.targetID, (err, results) => {
        res.json(createResponse(err, results.youtube));
    });
});

router.get('/title/:targetID/credits', (req, res) => {
    tmdb.movieCredits(req.params.targetID, (err, results) => {
        res.json(createResponse(err, results));
    });
});

// MARK: AUTHENTICATED ROUTES

router.get('/profile', isAuthenticated, (req, res) => {
    res.redirect('/profile/' + req.user.username);
});

router.get('/profile/follows', isAuthenticated, (req, res) => {
    res.redirect('/profile/' + req.user.username + '/follows');
});

router.get('/profile/followers', isAuthenticated, (req, res) => {
    res.redirect('/profile/' + req.user.username + '/followers');
});

router.get('/profile/:targetUsername/follows', isAuthenticated, (req, res) => {
    User_Follow.findAll({ where: { username: req.params.targetUsername } })
    .then((user_follow) => {
        if (user_follow && user_follow.length) {
            var resJSON = {
                success: true,
                users: []
            };
            for (var i = 0; i < user_follow.length; i++) {
                res.status(200);
                User.findOne({ where: { username: user_follow[i].follows } })
                .then((user) => {
                    if (user) {
                        var userJSON = {
                            username: user.username,
                            name: user.name,
                            picture: user.picture
                        };
                        resJSON.users.push(userJSON);
                        res.json(resJSON); // PROBLEMATIC - SENDING RESPONSE IN A LOOP - SEND BATCH RESPONSE INSTEAD
                    } else {
                        const err = 'non-existing follower!';
                        console.error(err);
                        return res.json(createResponse(err));
                    }
                })
                .catch((err) => { 
                    console.error(err);
                    return res.json(createResponse(err));
                }
            );
        }
    } else {
        res.status(400);
        res.json({ success: false, msg: 'no such user!' });
    }})
    .catch((err) => { console.error(err); });
});

router.get('/profile/:targetUsername/followers', isAuthenticated, (req, res) => {
    User_Follow.findAll({ where: { follows: req.params.targetUsername } })
    .then((user_follow) => {
        if (user_follow && user_follow.length) {
            var resJSON = {
                success: true,
                users: []
            };
            var length = user_follow.length;
            for (var i = 0; i < length; i++) {
                res.status(200);
                User.findOne({ where: { username: user_follow[i].username } })
                .then((user) => {
                    if (user) {
                        var userJSON = {
                            username: user.username,
                            name: user.name,
                            picture: user.picture
                        };
                        resJSON.users.push(userJSON);
                        res.json(resJSON); // PROBLEMATIC - SEND BATCH RESPONSE INSTEAD OF MULTIPLE RESPONSES
                    } else {
                        console.error('non-existing follower!');
                    }
                })
                .catch((err) => { console.error(err); });
            }
        } else {
            const err = 'no such user!';
            console.error(err);
            res.status(400);
            res.json(createResponse(err));
        }
    })
    .catch((err) => { console.error(err); });
});

router.get('/profile/:targetUsername', isAuthenticated, (req, res) => {
    User.findOne({ where: { username: req.params.targetUsername } })
    .then((user) => {
        if (user) {
            var resJSON = {
                success: true,
                username: user.username,
                name: user.name,
                picture: user.picture,
                bio: user.bio
            };
            User_Follow.count({ where: { username: user.username } })
            .then((count) => { 
                resJSON.follows = count; 
            });
            User_Follow.count({ where: { follows: user.username } })
            .then((count) => { 
                resJSON.followers = count; res.json(resJSON); 
            });
            res.status(200);
        } else {
            const err = 'user ' + req.params.targetUsername + ' not found in /profile/:targetUsername';
            console.error(err);
            res.status(400);
            res.json(createResponse(err));
        }
    })
    .catch((err) => {
        console.error(err); 
        res.status(500);
        res.json(createResponse(err));
    });
});

router.post('/profile', isAuthenticated, (req, res) => {
    // a GET request is more suitable for such function
    // user deserialization is available in Passport.js
    // username can be retrieved by req.user.username and necessary DB requests can be
    // performed to populate the fields of the profile page
    if (req.body.name) {
        req.user.name = req.body.name;
    }
    if (req.body.bio) {
        req.user.bio = req.body.bio;
    }
    if (req.body.picture == 'delete') {
        req.user.picture = null;
    }

    req.user.save()
    .then((user) => {
        if (user) {
            res.status(200);
            res.json(createResponse(null, 'successfully updated profile!'));
        } else { //this case is nearly impossible
            res.status(400);
            res.json({ success: false, msg: 'no such user!' });
        }
    })
    .catch(function (err) { console.log(err); });
});

router.all('*', (req, res) => {
    res.status(404);
    res.json({
        error: 'Invalid request'
    })
});

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated())
    return next();
    res.status(401);
    res.json({
        error: "Not authenticated!"
    });
}

module.exports = router;
