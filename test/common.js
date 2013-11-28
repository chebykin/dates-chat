"use strict";

global.config = require('../config')[process.env.NODE_ENV];
global.Q = require('q');
global.sinon = require('sinon');
global.chai = require('chai');
global.expect = require('chai').expect;
global.should = require('chai').should();

var sinonChai = require('sinon-chai');

chai.use(sinonChai);


