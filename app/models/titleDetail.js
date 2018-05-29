class TitleDetail {
    constructor(original_title, poster_path, id, release_date, overview, genres, 
        runtime, status, tagline, vote_averge, vote_count, cast, crew, trailer, argsObject) {
        // check if required arguments were provided and set class properties
        var props = ['original_title', 'poster_path', 'id', 'release_date', 'overview','genres', 
        'runtime', 'status', 'tagline', 'vote_average', 'vote_count', 'cast', 'crew', 'trailer'];

        for (var i = 0; i < arguments.length; i++) {
            if (typeof(arguments[i]) === 'undefined') {
                console.error('TitleDetail constructor did not receive ' + props[i]);
            }
        }

        for (var i = 0; i < props.length; i++) {
            this[props[i]] = arguments[i];
        }

        if (argsObject) {
            let additionalKeys = Object.keys(argsObject);
            for (var i = 0; i < additionalKeys.length; i++) {
                this[additionalKeys[i]] = argsObject[additionalKeys[i]];
            }
        }
    }
}

module.exports = TitleDetail;
