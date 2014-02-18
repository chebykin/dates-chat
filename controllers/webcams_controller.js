"use strict";

var WebcamsRequest = module.exports.request = {};
var WebcamsResponse = module.exports.response = {};

var Webcams = require('../models/webcams'),
    config = require('../config');

WebcamsRequest.post = function (ws, payload) {
    Webcams.add(ws.collection.current_name, ws.user_id, payload);
};

WebcamsResponse.tick = function (collection) {
    if (collection.ids().length) {
        return [{'webcams#replace': Webcams.all_new(collection.opposite.current_name)}];
    } else {
        return null;
    }
};

WebcamsResponse.replace = function (ws) {
    return [{'webcams#replace': Webcams.all(ws.collection.opposite.current_name)}];
};
