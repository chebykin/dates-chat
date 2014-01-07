"use strict";

var WebSocket = require('ws'),
    responder = require('./responder');

var error_types = {
    user_offline: 'Seems this user is offline.',
    billing_error: 'Billing server error. Please, contact support.'
};

/**
 *
 * @param {Error} error
 * @param {WebSocket} ws
 */
function handleError(error, ws) {
    console.log("Error thrown: " + error.message);

    error.handle(ws);
}
/**
 * Send error message to front-end.
 *
 * If private_description is specified, it will replace message from arguments with corresponding to
 * private_description property name from error_types object
 *
 * @param {String} message
 * @param {String} private_description
 * @constructor
 */
function PublicError(message, private_description) {
    if (typeof private_description === 'string') {
        this.message = error_types[private_description];
    } else {
        this.message = message;
    }
}

PublicError.prototype = new Error();

PublicError.prototype.handle = function (ws) {
    ws.send(responder.error(this.message));
};


/**
 *
 * @param message
 * @constructor
 */
function AuthorizationError(message) {
    this.message = message;
}

AuthorizationError.prototype = new Error();

AuthorizationError.prototype.handle = function (ws) {
    ws.send(responder.error('Authorization error.'));
    ws.close(4401, 'Authorization required.');
};

Error.prototype.handle = function (ws) {};

module.exports.handleError = handleError;
module.exports.public = PublicError;
module.exports.auth = AuthorizationError;
