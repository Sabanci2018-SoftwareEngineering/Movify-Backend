var router = require('express').Router()
var omdbApi = require('omdb-api-pt')

var omdb = new omdbApi({
    apiKey: 'abcdc758'
});

router.use('*', (req, res, next) => {
    console.log('[' + req.method + '] ' + req.ip + ' ' + req.path)
    console.log('request parameters: ', req.params)
    console.log('request body: ', JSON.stringify(req.body) + '\n');
    res.setHeader('Content-Type', 'application/json');
    next();
});

router.post('/search', (req, res) => {
    omdb.bySearch({
        search: req.body.keyword
    })
    .then(results => res.json({
        success: true,
        results: results
    }))
    .catch(err => res.json({
        success: false,
        error: err
    }));
});

router.get('/title/:targetID', (req, res) => {
    // retreive the movie data and send response
    omdb.byId({
        imdb: req.params.targetID
    })
    .then(results => res.json({
        success: true,
        results: results
    }))
    .catch(err => res.json({
        success: false,
        error: err
    }));
});

router.all('*', (req, res) => {
    res.status(404);
    res.json({
        error: "Invalid request"
    })
});

module.exports = router;