"use strict";

var Dialog = require('./dialog');

function DialogsCollection () {
    this.collection = new Map();
}

DialogsCollection.prototype.get = function (key) {
    var key_array = key.split('_'),
        man_id = key_array[0],
        woman_id = key_array[1];

    if (!this.collection.has(key)) {
        this.collection.set(key, new Dialog(man_id, woman_id));
    }

    return this.collection.get(key);
};

DialogsCollection.prototype.set = function (key, value) {
    return this.collection.set(key, value);
};

var dialogs = new DialogsCollection();
module.exports = dialogs;