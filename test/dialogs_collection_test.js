var dialogs = require('../lib/dialogs_collection'),
    Dialog = require('../lib/dialog'),
    expect = require('chai').expect,
    sinon = require('sinon');

describe('Dialogs collection', function () {
    it('should create new dialog instance if dialog does not exists', function () {
        expect(dialogs.get('137_103')).to.be.an.instanceof(Dialog);
    });
});