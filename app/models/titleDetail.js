class TitleDetail {
    constructor(original_title, poster_path, id, release_date, 
        overview, genres, runtime, status, tagline, vote_averge, vote_count, cast, crew) {
        // check if required arguments were provided and set class properties
        for (var i = 0; i < arguments.length; i++) {
            if (typeof(arguments[i]) === 'undefined') {
                throw 'TitleItem constructor did not receive ' + arguments[i];
            }
        }

        props = ['original_title', 'poster_path', 'id', 'release_date', 'overview','genres', 
            'runtime', 'status', 'tagline', 'vote_average', 'vote_count', 'cast', 'crew'];
        for (var i = 0; i < props.length; i++) {
            this[props[i]] = arguments[i];
        }
    }
}

module.exports = TitleDetail;