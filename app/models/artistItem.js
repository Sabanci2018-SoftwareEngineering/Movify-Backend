var TitleItem = require('./titleItem')

class ArtistItem {
    constructor(id, name, biography, images, movies) {
        // check if required arguments were provided
        var props = ['id', 'name', 'biography', 'images', 'movies'];
        for (var i = 0; i < arguments.length; i++) {
            if (typeof(arguments[i]) === 'undefined') {
                console.error('ArtistItem constructor did not receive ' + props[i]);
            }
        }

        // set required keys
        for (var i = 0; i < props.length - 1; i++) {
            this[props[i]] = arguments[i];
        }


	this['movies'] = [];
	for (var i = 0; i < movies.length; i++) {
	    this['movies'].push(new TitleItem(movies[i].original_title, movies[i].poster_path, movies[i].id, movies[i].release_date, movies[i].overview));
	}
    }
}

module.exports = ArtistItem;
