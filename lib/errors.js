var error_types = {
    user_offline: 'Seems this user is offline'
};

/**
 * For server logging
 *
 * @param message
 * @constructor
 */
function PrivateError(message) {
    console.log("\nPrivateError thrown: " + message);
    this.message = message;
}

/**
 * For browser error string
 * @param message
 * @constructor
 * @param private_description
 */
function PublicError(message, private_description) {
    console.log("\nPublicError thrown: " + message);
    if (private_description) {
        this.message = error_types[private_description];
    } else {
        this.message = message;
    }
}

PrivateError.prototype = new Error();
PublicError.prototype = new Error();

module.exports.private = PrivateError;
module.exports.public = PublicError;
