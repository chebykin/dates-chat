"use strict";

module.exports = new DialogsCollection();

var Dialog = require('./dialog'),
    utils = require('./utils');

function DialogsCollection () {
    this.collection = new Map();
}

DialogsCollection.prototype.between = function (one, another) {
    var key = utils.dialog_key(one, another),
        ids = key.split('_'),
        man_id = ids[0],
        woman_id = ids[1];

    if (!this.collection.has(key)) {
        this.collection.set(key, new Dialog(man_id, woman_id));
    }

    return this.collection.get(key);
};

DialogsCollection.prototype.set = function (key, value) {
    return this.collection.set(key, value);
};

DialogsCollection.prototype.del = function (key) {
    this.collection.delete(key);
};

DialogsCollection.prototype.clear = function () {
    this.collection.clear();
};
