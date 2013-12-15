"use strict";

var dialogs = require('../lib/dialogs_collection'),
    Dialog = require('../lib/dialog'),
    utils = require('../lib/utils'),
    men = require('../lib/user').men,
    women = require('../lib/user').women;

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

        expect(dialogs.size()).to.equal(3);
        dialogs.clear();
        expect(dialogs.size()).to.equal(0);

        delete men.all[27];
        delete men.all[64];
    });

    it('should delete object from collection', function () {
        dialogs.between(137, 103);
        expect(dialogs.size()).to.equal(1);
        dialogs.del('137_103');
        expect(dialogs.size()).to.equal(0);
    });

    it('should keep updated dialog in collection', function () {
        var dialog = dialogs.between(137, 103);

        dialog.state = 'updated';
        expect(dialog.state).to.equal(dialogs.between(137, 103).state);
    });

    it('should be able to return all keys', function () {
        var expexted_array = [[137, 103], [27, 103], [64, 103], [64, 553]];
        men.all[27] = [{}, {}];
        men.all[64] = [{}, {}];
        women.all[553] = [{}, {}];

        dialogs.between(103, 137);
        dialogs.between(103, 27);
        dialogs.between(103, 64);
        dialogs.between(553, 64);

        console.log(dialogs.keys());
        console.log(expexted_array);
        expect(utils.equalToArray.call(dialogs.keys(), expexted_array)).to.ok;

        delete men.all[27];
        delete men.all[64];
    });
});