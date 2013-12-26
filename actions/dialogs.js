"use strict";

var men = require('../lib/user').men,
    women = require('../lib/user').women,
    utils = require('../lib/utils'),
    dialogs = require('../lib/dialogs_collection'),
    responder = require('../lib/responder'),
    PrivateError = require('../lib/errors').private,
    PublicError = require('../lib/errors').public,
    redis = require('../lib/redis').create();

module.exports = function (ws, method, payload) {
    var dialog;

    if (method === 'post') {
        dialog = dialogs.between(ws.user_id, payload.contact_id);

        if(ws.user_id === dialog.man_id) {
            dialog.manual_on()
                .fail(function (err) {
                    throw new PublicError(err);
                });
        } else {
            throw new Error('Dialogs Action: Only man can toggle dialogs');
        }

    } else if (method === 'destroy') {
        dialog = dialogs.between(ws.user_id, payload.contact_id);

        if(ws.user_id === dialog.man_id) {
            dialog.manual_off();
        } else {
            throw new Error('Dialogs Action: Only man can toggle dialogs');
        }
    } else {
        throw new PrivateError('Dialogs Action: Wrong method');
    }
};
