"use strict";

var SettingsRequest = module.exports.request = {};
var SettingsResponse = module.exports.response = {};

var WebSocket = require('ws'),
    Q = require('q'),
    send = require('../lib/sender').send,
    respond = require('../lib/responder').respond,
    Settings = require('../models/settings');

SettingsRequest.get = function (ws) {
    return respond.to_socket(ws).using(SettingsResponse.replace);
};

SettingsRequest.post = function (ws, payload) {
    Settings.update_settings(ws.user_id, payload);
    return respond.to_user(ws.user_id).using(SettingsResponse.replace);

};

SettingsResponse.replace = function (user) {
    if (typeof user === 'number') {
        return [{'settings#replace': Settings.get(user)}];
    } else if (typeof user === 'object' && user instanceof WebSocket) {
        return [{'settings#replace': Settings.get(user.user_id)}];
    }
};
