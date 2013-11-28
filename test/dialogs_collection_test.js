var dialogs = require('../lib/dialogs_collection'),
    Dialog = require('../lib/dialog');

describe('Dialogs collection', function () {
    it('should create new dialog instance if dialog does not exists', function () {
        expect(dialogs.between(103, '137')).to.be.an.instanceof(Dialog);
    });
});