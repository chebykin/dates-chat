"use strict";

var men = require('../lib/user').men,
    women = require('../lib/user').women,
    utils = require('../lib/utils'),
    Q = require('q'),
    dialogs = require('../lib/dialogs_collection'),
    PublicError = require('../lib/errors').public,
    redis = require('../lib/redis').create();

module.exports = function (ws, method, payload) {
    var dialog,
        deferred = Q.defer();

    if (['post', 'destroy'].indexOf(method) >= 0) {
        dialog = dialogs.between(ws.user_id, payload.contact_id);

        if(ws.user_id === dialog.man_id) {
            deferred.reject(new PublicError('Dialogs Action: Only man can toggle dialogs'));
        }
    }

    switch (method) {
        case 'post':
            return dialog.manual_on();
        case 'destroy':
            return Q.resolve(dialog.manual_off());
        default:
            deferred.reject(new PublicError('Dialogs Action: Wrong method'));
    }

    return deferred.promise;
};
