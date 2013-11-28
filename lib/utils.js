"use strict";

var utils = module.exports = {};

var PrivateError = require('../lib/errors').private,
    PublicError = require('./errors').public,
    men = require('./user').men,
    women = require('./user').women;

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

    try {
        obj = JSON.parse(raw_obj);
    }
    catch (e) {
        return null;
    }

    if (obj !== null && obj.hasOwnProperty(property)) {
        value = obj[property];
    }
    else {
        value = null;
    }

    return value;
};

utils.parseDecimal = function (val) {
    return parseInt(val, 10);
};

// http://stackoverflow.com/questions/7837456/comparing-two-arrays-in-javascript
utils.equalToArray = function (array) {
    if (!array)
        return false;

    if (this.length != array.length)
        return false;

    for (var i = 0; i < this.length; i++) {
        if (this[i] instanceof Array && array[i] instanceof Array) {
            if (!utils.equalToArray.call(this[i], array[i]))
                return false;
        }
        else if (this[i] !== array[i]) {
            return false;
        }
    }

    return true;
};

utils.dialog_key = function (one, another) {
    one = parseInt(one, 10);
    another = parseInt(another, 10);

    if (!one || !another) {
        throw new PublicError('Error while generating key for dialog.');
    }

    var man_keys = men.keys();
    var woman_keys = women.keys();

    var m = (man_keys.indexOf(parseInt(one, 10)) >= 0) ?
        one :
        (man_keys.indexOf(parseInt(another, 10)) >= 0) ? another : null;

    var w = (woman_keys.indexOf(parseInt(another, 10)) >= 0) ?
        another :
        (woman_keys.indexOf(parseInt(one, 10)) >= 0) ? one : null;

    if (m === null) {
        throw new PublicError("Error while calculating dialog key: can't determine man key.");
    }

    if (w === null) {
        throw new PublicError("Error while calculating dialog key: can't determine woman key.");
    }

    return m + '_' + w;
};