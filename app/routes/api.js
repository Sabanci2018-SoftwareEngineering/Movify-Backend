var router = require('express').Router()

var Sequelize = require('sequelize');
var User = require('../models/user.js');
var User_Activation = require('../models/user_activation.js');
var User_Follow = require('../models/user_follow.js');
var User_Forgot = require('../models/user_forgot.js');
var passport = require('passport');
var crypto = require('crypto');
var rn = require('random-number');
var transporter = require('../config/transporter.js');

var gen = rn.generator({
        min: 0,
        max:  9,
        integer: true
});

const MovieDB = require('moviedb')('52d83a93b06d28b814fd3ab6f12bcc2a');

var TMDB = require('../models/movie');

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
                                .then(function (user_activation) {
                                        if (user_activation) {
                                                res.status(200);
                                                res.json({ success: true, msg: 'successful activation!' });
                                                user_activation.destroy();
                                                User.findOne({ where: { username: req.params.targetUsername }}).then(function(user) { user.isActive = 1; user.save(); });
                                        } else {
                                                res.status(400);
                                                res.json({ success: false, msg: 'no such activation key!' });
                                        }
                                })
                                .catch(function (err) { console.log(err); }
                );
});

router.post('/forgot/:targetUsername/:targetKey', (req, res) => {
                User.findOne({ where: { username: req.params.targetUsername } })
                        .then(function (user) {
                                if (user) {
                                        User_Forgot.findOne({ where: { username: user.username, forgot_key: req.params.targetKey } })
                                                        .then(function (user_forgot) {
                                                                if (user_forgot) {
                                                                        if (user_forgot.expiry_date <= new Date()) {
                                                                                user_forgot.destroy();

                                                                                res.status(400);
                                                                                res.json({ success: false, msg: 'forgot key has been expired' });
                                                                        } else {
                                                                                var shasum = crypto.createHash('sha1');
                                                                                shasum.update(req.body.password);
                                                                                req.body.password = shasum.digest('hex');
                                                                                user.password = req.body.password;

                                                                                user.save();
                                                                                user_forgot.destroy();

                                                                                res.status(200);
                                                                                res.json({ success: true, msg: 'successfully changed password!' });
                                                                        }
                                                                } else {
                                                                        res.status(400);
                                                                        res.json({ success: false, msg: 'no such forgot key!' });
                                                                }
                                                        }).catch(function (err) { console.log(err); }
                                        );
                                } else {
                                        res.status(400);
                                        res.json({ success: false, msg: 'no such user!' });
                                }
                        }).catch(function (err) { console.log(err); }
                );
});

router.post('/forgot', (req, res) => {
                User.findOne({ where: { username: req.body.username, email: req.body.email } })
                        .then(function (user) {
                                if (user) {
                                        var forgot_key = ''
                                        for (var i = 0; i < 8; i += 1) forgot_key += '' + gen();

                                        var mailOptions = {
                                                from: 'Movify',
                                                to: user.email,
                                                subject: 'Movify Forgot Password Key',
                                                html: '<h1>Dear ' + user.name + ',</h1><p>Here is your forgot password key: ' + forgot_key + ' </p>'
                                        }

                                        transporter.sendMail(mailOptions, function(error, info){
                                                if (error) {
                                                        console.log(error);
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
                        .catch(function (err) { console.log(err); }
                );
});

router.get('/profile', isAuthenticated, (req, res) => {
                res.redirect('/profile/'+res.user.username);
});

router.get('/profile/follows', isAuthenticated, (req, res) => {
                res.redirect('/profile/'+res.user.username+'/follows');
});

router.get('/profile/followers', isAuthenticated, (req, res) => {
                res.redirect('/profile/'+res.user.username+'/followers');
});

router.get('/profile/:targetUsername/follows', isAuthenticated, (req, res) => {
                User_Follow.findAll({ where: { username: req.params.targetUsername } })
                        .then(function (user_follow) {
                                if (user_follow && user_follow.length) {
                                        var resJSON = {
                                                success: true,
                                                users: []
                                        };
                                        var length = user_follow.length;
                                        for (var i = 0; i < length; i++) {
                                                res.status(200);
                                                User.findOne({ where: { username: user_follow[i].follows } })
                                                        .then(function (user) {
                                                                if (user) {
                                                                        var userJSON = {
                                                                                username: user.username,
                                                                                name: user.name,
                                                                                picture: user.picture
                                                                        };
                                                                        resJSON.users.push(userJSON);
                                                                        res.json(resJSON);
                                                                } else {
                                                                        console.log('non-existing follower!');
                                                                }
                                                        })
                                                        .catch(function (err) { console.log(err); }
                                                );
                                        }
                                } else {
                                        res.status(400);
                                        res.json({ success: false, msg: 'no such user!' });
                                }
                        })
                        .catch(function (err) { console.log(err); }
                );
});

router.get('/profile/:targetUsername/followers', isAuthenticated, (req, res) => {
                User_Follow.findAll({ where: { follows: req.params.targetUsername } })
                        .then(function (user_follow) {
                                if (user_follow && user_follow.length) {
                                        var resJSON = {
                                                success: true,
                                                users: []
                                        };
                                        var length = user_follow.length;
                                        for (var i = 0; i < length; i++) {
                                                res.status(200);
                                                User.findOne({ where: { username: user_follow[i].username } })
                                                        .then(function (user) {
                                                                if (user) {
                                                                        var userJSON = {
                                                                                username: user.username,
                                                                                name: user.name,
                                                                                picture: user.picture
                                                                        };
                                                                        resJSON.users.push(userJSON);
                                                                        res.json(resJSON);
                                                                } else {
                                                                        console.log('non-existing follower!');
                                                                }
                                                        })
                                                        .catch(function (err) { console.log(err); }
                                                );
                                        }
                                } else {
                                        res.status(400);
                                        res.json({ success: false, msg: 'no such user!' });
                                }
                        })
                        .catch(function (err) { console.log(err); }
                );
});

router.get('/profile/:targetUsername', isAuthenticated, (req, res) => {
                User.findOne({ where: { username: req.params.targetUsername } })
                        .then(function (user) {
                                if (user) {
                                        var resJSON = {
                                                success: true,
                                                username: user.username,
                                                name: user.name,
                                                picture: user.picture,
                                                bio: user.bio
                                        };
                                        User_Follow.count({ where: { username: user.username } }).then(function (count) { resJSON.follows = count; });
                                        User_Follow.count({ where: { follows: user.username } }).then(function (count) { resJSON.followers = count; res.json(resJSON); });
                                        res.status(200);
                                } else {
                                        res.status(400);
                                        res.json({ success: false, msg: 'no such user!' });
                                }
                        })
                        .catch(function (err) { console.log(err); }
                );
});

router.post('/profile', isAuthenticated, (req, res) => {
                if (req.body.name)
                        req.user.name = req.body.name;
                if (req.body.bio)
                        req.user.bio = req.body.bio;
                if (req.body.picture == 'delete')
                        req.user.picture = null;
                req.user.save()
                        .then(function (user) {
                                if (user) {
                                        res.status(200);
                                        res.json({ success: true, msg: 'successfully updated profile!' });
                                } else { //this case is nearly impossible
                                        res.status(400);
                                        res.json({ success: false, msg: 'no such user!' });
                                }
                        })
                        .catch(function (err) { console.log(err); }
                );
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

router.all('*', (req, res) => {
    res.status(404);
    res.json({
        error: "Invalid request"
    })
});

function isAuthenticated(req, res, next) {
        if (req.isAuthenticated())
                return next();
        res.status(400);
        res.json({
                error: "Not authenticated!"
        });
}

module.exports = router;
