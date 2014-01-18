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

    describe('acting with ids', function () {
        beforeEach(function () {
            dialogs.clear();

            men.all[27] = [{}, {}];
            men.all[64] = [{}, {}];
            women.all[553] = [{}, {}];

            dialogs.between(103, 137)._state = 'initialized';
            dialogs.between(103, 27)._state = 'on';
            dialogs.between(103, 64)._state = "manual_off";
            dialogs.between(553, 64)._state = 'on';
        });

        afterEach(function () {
            delete men.all[27];
            delete men.all[64];
            dialogs.collection = {};
        });

        it('should be able to return all keys', function () {
            var expected_keys = [[137, 103], [27, 103], [64, 103], [64, 553]];

            expect(utils.equalToArray.call(dialogs.keys(), expected_keys)).to.be.ok;
        });

        it('should be able to return only active dialogs keys', function () {
            var expected_keys = [[27, 103], [64, 553]];

            expect(utils.equalToArray.call(dialogs.active_keys(), expected_keys)).to.be.ok;
        });

        it('should return active man pairs', function () {
            var expected_ids = [553];

            expect(utils.equalToArray.call(dialogs.pairs_of_man(64), expected_ids)).to.be.ok;
        });

        it('should return active woman pairs', function () {
            var expected_ids = [27];

            expect(utils.equalToArray.call(dialogs.pairs_of_woman(103), expected_ids)).to.be.ok;
        });
    });
});