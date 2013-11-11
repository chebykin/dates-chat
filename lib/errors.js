/**
 * For server logging
 *
 * @param message
 * @constructor
 */
function PrivateError(message) {
    this.message = message;
}

/**
 * For browser error string
 * @param message
 * @constructor
 */
function PublicError(message) {
    this.message = message;
}

PrivateError.prototype = new Error();
PublicError.prototype = new Error();

module.exports.private = PrivateError;
module.exports.public = PublicError;
