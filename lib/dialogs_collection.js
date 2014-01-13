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

// Dialogs that are in on mode
DialogsCollection.prototype.active_keys = function () {
    var dialogs = this;

    return Object.keys(this.collection)
        .filter(function (value) {
            return dialogs.collection[value]._state === 'ON';
        })
        .map(function (value) {
        return value.split('_').map(utils.parseDecimal);
        });
};

/**
 * Returns women ids with which man currently have active dialog.
 *
 * @param {number} man_id
 * @returns {Array}
 */
DialogsCollection.prototype.pairs_of_man = function (man_id) {
    man_id = parseInt(man_id, 10);

    return this.active_keys()
        .filter(function (value){
            return parseInt(value[0], 10) === man_id;
        })
        .map(function (value) {
            return parseInt(value[1], 10);
        });
};

/**
 * Returns men ids with which woman currently have active dialog.
 *
 * @param {number} woman_id
 * @returns {Array}
 */
DialogsCollection.prototype.pairs_of_woman = function (woman_id) {
    woman_id = parseInt(woman_id, 10);
    return this.active_keys()
        .filter(function (value){
            return parseInt(value[1], 10) === woman_id;
        })
        .map(function (value) {
            return parseInt(value[0], 10);
        });
};