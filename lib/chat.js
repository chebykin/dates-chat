/**
 * Module dependencies.
 */
var application = require('./application');

exports = module.exports = createApplication;

function createApplication() {
    application.init({});
    return application;
}

