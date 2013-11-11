/**
 * Module dependencies.
 */
var PrivateError = require('../lib/errors').private;

var utils = exports = module.exports = {};

utils.push_arr = function (obj, key, data) {
    if (!Array.isArray(obj[key])) {
        obj[key] = [];
    }
    obj[key].push(data);
};

utils.message2object = function (message) {
    return JSON.parse(message);
};

utils.getCookie = function (name, cookies) {
    if (cookies) {
        var matches = cookies.match(new RegExp(
            "(?:^|; )" + name.replace(/([\.$?*|{}\(\)\[\]\\\/\+^])/g, '\\$1') + "=([^;]*)"
        ));
        return matches ? decodeURIComponent(matches[1]) : undefined;
    } else {
        throw new PrivateError("Cookie key " + name + " doesn't exists");
    }
};

utils.getProp = function (raw_obj, property) {
    var value, obj;

    try { obj = JSON.parse(raw_obj); }
    catch (e) { return null; }

    if (obj !== null && obj.hasOwnProperty(property)) { value = obj[property]; }
    else { value = null; }

    return value;
};