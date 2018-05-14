class UserItem {
    constructor(username, follower_count, follow_count, picture) {
        // check if required arguments were provided
        var props = ['username', 'follower_count', 'follow_count', 'picture'];
        for (var i = 0; i < arguments.length; i++) {
            if (typeof(arguments[i]) === 'undefined') {
                throw 'TitleItem constructor did not receive ' + props[i];
            }
        }

        // set required keys
        for (var i = 0; i < props.length; i++) {
            this[props[i]] = arguments[i];
        }
    }
}

module.exports = UserItem;