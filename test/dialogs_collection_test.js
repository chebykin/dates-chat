"use strict";

var dialogs = require('../lib/dialogs_collection'),
    Dialog = require('../lib/dialog'),
    men = require('../lib/user').men;

describe('Dialogs collection', function () {
    beforeEach(function () {
        dialogs.clear();
    });

    it('should create new dialog instance if dialog does not exists', function () {
        expect(dialogs.between(103, '137')).to.be.an.instanceof(Dialog);
    });

    it('should clear all dialogs by clear method', function () {
        men.all[27] = [{}, {}];
        men.all[64] = [{}, {}];

        dialogs.between(103, 137);
        dialogs.between(103, 27);
        dialogs.between(103, 64);

        expect(dialogs.collection.size).to.equal(3);
        dialogs.clear();
        expect(dialogs.collection.size).to.equal(0);

        delete men.all[27];
        delete men.all[64];
    });

    it('should delete object from collection', function () {
        dialogs.between(137, 103);
        expect(dialogs.collection.size).to.equal(1);
        dialogs.del('137_103');
        expect(dialogs.collection.size).to.equal(0);
    });

    it('should keep updated dialog in collection', function () {
        var dialog = dialogs.between(137, 103);

        dialog.state = 'updated';
        expect(dialog.state).to.equal(dialogs.between(137, 103).state);
    });
});