class TitleItem {
    constructor(original_title, poster_path, id, release_date, overview) {
        // check if required arguments were provided
        for (var i = 0; i < arguments.length; i++) {
            if (typeof(arguments[i]) === 'undefined') {
                throw 'TitleItem constructor did not receive ' + arguments[i];
            }
        }

        // set required keys
        props = ['original_title', 'poster_path', 'id', 'release_date', 'overview'];
        for (var i = 0; i < props.length; i++) {
            this[props[i]] = arguments[i];
        }
    }
}

module.exports = TitleItem;