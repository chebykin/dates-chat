"use strict";

var app = exports = module.exports = {},
    utils = require('./utils'),
    Q = require('q'),
    WebSocketServer = require('ws').Server,
    PublicError = require('./errors').public,
    handleError = require('./errors').handleError;

app.init = function () {
    this.stack = {};
    this.settings = {};
    this.defaultConfiguration();
};

app.defaultConfiguration = function () {
    this.set('env', process.env.NODE_ENV);
    this.set('port', process.env.PORT);
};

app.use = function (resource, fn) {
    this.stack[resource] = fn;
};

app.handle = function (ws, resource, method, payload) {
    if (typeof this.stack[resource] === "function") {
        return this.stack[resource].call(this, ws, method, payload);
    } else {
        return Q.reject(new PublicError('Handling resource "' + resource + '", but it does not exists.'));
    }
};

app.set = function (setting, value) {
    if (1 == arguments.length) {
        return this.settings[setting];
    } else {
        this.settings[setting] = value;
        return this;
    }
};

app.listen = function () {
    var args;

    if (typeof arguments[0] === 'object') {
        args = arguments[0];
    } else {
        args = {port: arguments[0]};
    }

    this.wss = new WebSocketServer(args);
    this.wss.on('connection', function (ws) {

        app.handle(ws, 'sessions', 'post')
            .fail(function (e) {
                handleError(e, ws);
            });

        ws.on('message', function (message) {
            message = utils.message2object(message);
            app.handle(ws, message.resource, message.method, message.payload)
                .fail(function (e) {
                    handleError(e, ws);
                });
        });
    });

    return this.wss;
};
