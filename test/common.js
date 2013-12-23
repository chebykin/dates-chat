"use strict";

global.config = require('../config');
global.Q = require('q');
global.sinon = require('sinon');
global.chai = require('chai');
global.expect = require('chai').expect;
global.should = require('chai').should();

global.bad_fail = function (e) {
    throw e;
};

var sinonChai = require('sinon-chai');

chai.use(sinonChai);


