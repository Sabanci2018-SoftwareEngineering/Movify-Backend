var router = require('express').Router()
var TMDB = require('../models/movie');

var tmdb = new TMDB;

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

router.post('/search', (req, res) => {
    tmdb.searchMovie(req.body.keyword, (err, results) => {
        res.json(createResponse(err, results))
    })
});

router.get('/title/:targetID', (req, res) => {
    tmdb.movieInfo(req.params.targetID, (err, results) => {
        res.json(createResponse(err, results));
    })
});

router.all('*', (req, res) => {
    res.status(404);
    res.json({
        error: "Invalid request"
    })
});

module.exports = router;