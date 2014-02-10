"use strict";

var SettingsRequest = module.exports.request = {};
var SettingsResponse = module.exports.response = {};

var WebSocket = require('ws'),
    Q = require('q'),
    send = require('../lib/sender').send,
    Settings = require('../models/settings');

SettingsRequest.get = function (ws) {
    return SettingsResponse.replace(ws);
};

SettingsRequest.post = function (ws, payload) {
    return Q.resolve(ws.collection.update_settings(ws.user_id, payload));
};

SettingsResponse.replace = function (user_id) {
    return [{'settings#replace': Settings.get(user_id)}];
};
