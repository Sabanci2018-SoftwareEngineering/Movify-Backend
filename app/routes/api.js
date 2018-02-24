var router = require('express').Router()

// path "*" refers to any path
router.use('*', (req, res, next) => {
    res.setHeader('Content-Type', 'application/json');
    next();
});

router.get('/', (req, res) => {
    res.json({
        message: "Index"
    })
});

router.get('/movie/:targetID', (req, res) => {

    res.json({
        message: "Movie",
        target: req.params.targetID
    });
});

router.all('*', (req, res) => {
    res.status(404);
    res.json({
        error: "Invalid request"
    })
})

module.exports = router;