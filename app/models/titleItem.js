class TitleItem {
    constructor(original_title, poster_path, id, release_date, overview, argsObject) {
        // check if required arguments were provided
        var props = ['original_title', 'poster_path', 'id', 'release_date', 'overview'];
        for (var i = 0; i < arguments.length; i++) {
            if (typeof(arguments[i]) === 'undefined') {
                console.error('TitleItem constructor did not receive ' + props[i]);
            }
        }

        // set required keys
        for (var i = 0; i < props.length; i++) {
            this[props[i]] = arguments[i];
        }

        // set additional keys
        if (argsObject) {
            let additionalFields = Object.keys(argsObject);
            for (var i = 0; i < additionalFields.length; i++) {
                this[additionalFields[i]] = argsObject[additionalFields[i]];
            }
        }
    }
}

module.exports = TitleItem;
