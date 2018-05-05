/*
    * A title should contain at least these keys: ['original_title', 'poster_path', 'id']
    * Further keys may be added to the title item by providing an object containing further
    * keys, this object should be supplied as the argsObject parameter
*/

class TitleItem {
    constructor(original_title, poster_path, id, release_date, argsObject) {
        // remove first three arguments from argsObject if existent
        const requiredProps = ['original_title', 'poster_path', 'id', 'release_date'];

        // check if required arguments were provided
        const errHeader = 'TitleItem constructor did not receive ';
        if (typeof(original_title) === 'undefined') {
            throw  errHeader + 'original_title';
        }
        else if (typeof(poster_path) === 'undefined') {
            throw errHeader + 'poster_path';
        }
        else if (typeof(id) === 'undefined') {
            throw errHeader + 'id';
        }
        else if (typeof(release_date) === 'undefined') {
            throw errHeader + 'release_date';
        }

        // set required keys
        this.original_title = original_title;
        this.poster_path = poster_path;
        this.id = id;
        this.release_date = release_date;

        // set additional keys if existent
        if (argsObject) {
            for (var i = 0; i < requiredProps.length; i++) {
                delete argsObject[requiredProps[i]];
            }
            const additionalKeys = Object.keys(argsObject);
            for (var i = 0; i < additionalKeys.length; i++) {
                this[additionalKeys[i]] = argsObject[additionalKeys[i]];
            }
        }
    }
}

module.exports = TitleItem;