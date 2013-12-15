"use strict";

module.exports = new DialogsCollection();

var Dialog = require('./dialog'),
    utils = require('./utils');

function DialogsCollection () {
    // currently v8 doesn't support iteration over Map. so we adding a...
    // HACK: storing values to objects.
//    this.collection = new Map();
    this.collection = {};
}

DialogsCollection.prototype.between = function (one, another) {
    var key = utils.dialog_key(one, another),
        ids = key.split('_'),
        man_id = ids[0],
        woman_id = ids[1];

//    if (!this.collection.has(key)) {
//        this.collection.set(key, new Dialog(man_id, woman_id));
//    }
    if (!(key in this.collection)) {
        this.collection[key] = new Dialog(man_id, woman_id);
    }

//    return this.collection.get(key);
    return this.collection[key];
};

DialogsCollection.prototype.set = function (key, value) {
//    return this.collection.set(key, value);
    this.collection[key] = value;
};

DialogsCollection.prototype.del = function (key) {
//    this.collection.delete(key);
    delete this.collection[key];
};

DialogsCollection.prototype.clear = function () {
//    this.collection.clear();
    this.collection = {};
};

DialogsCollection.prototype.size = function () {
//    return this.collection.size;
    return parseInt(Object.keys(this.collection).length, 10);
};

DialogsCollection.prototype.keys = function () {
    // Map currently doesn't have any method like Object's Object.keys()

    return Object.keys(this.collection).map(function (value) {
        return value.split('_').map(utils.parseDecimal);
    });
};