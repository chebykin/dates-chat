"use strict";

var DialogsRequest = module.exports.request = {};
var DialogsResponse = module.exports.response = {};

var user = require('../lib/user'),
    men = user.men,
    women = user.women,
    utils = require('../lib/utils'),
    Q = require('q'),
    dialogs = require('../lib/dialogs_collection'),
    PublicError = require('../lib/errors').public,
    send = require('../lib/sender').send,
    redis = require('../lib/redis').current();

DialogsRequest.post = function (ws, payload) {
    var dialog = dialogs.between(ws.user_id, payload.contact_id);

    if (ws.user_id !== dialog.man_id) {
        return Q.reject(new PublicError('Dialogs Action: Only man can toggle dialogs'));
    }

    return dialog.manual_on();
};
DialogsRequest.destroy = function (ws, payload) {
    var dialog = dialogs.between(ws.user_id, payload.contact_id);

    if (ws.user_id !== dialog.man_id) {
        return Q.reject(new PublicError('Dialogs Action: Only man can toggle dialogs'));
    }

    return Q.resolve(dialog.manual_off());
};


DialogsResponse.update = function (state, user_id, contact_id) {
    var route = (state === 'on') ? 'dialogs#create' : 'dialogs#destroy';

    send({contact: contact_id}).to_user(user_id).using(route);
};


DialogsResponse.replace = function (ws) {
    var ids;

    if (ws.collection.is_woman()) {
        ids = dialogs.pairs_of_woman(ws.user_id);
    } else {
        ids = dialogs.pairs_of_man(ws.user_id);
    }

    send({contacts: ids}).to_socket(ws).using('dialogs#replace');
};