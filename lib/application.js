/**
 * Module dependencies.
 */
var app = exports = module.exports = {},
    utils = require('./utils'),
    WebSocketServer = require('ws').Server,
    PrivateError = require('./errors').private,
    PublicError = require('./errors').public;

app.init = function () {
    this.stack = {};
    this.settings = {};
    this.defaultConfiguration();
};

app.defaultConfiguration = function () {
    this.set('env', process.env.NODE_ENV || 'development');
    this.set('port', '10021');
};

app.use = function (resource, fn) {
    this.stack[resource] = fn;
};

app.handle = function (ws, resource, method, payload) {
    if (typeof this.stack[resource] === "function") {
        this.stack[resource].call(this, ws, method, payload);
    } else {
        throw new PrivateError('app.handle: Resource does not exists: ' + resource);
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

    try {
        this.wss = new WebSocketServer(args);
        this.wss.on('connection', function (ws) {
            app.handle(ws, 'sessions', 'post');
            ws.on('message', function (message) {
                try {
                    message = utils.message2object(message);
                    app.handle(ws, message.resource, message.method, message.payload);
                } catch (ex) {
                    if (ex instanceof PublicError) {
                        ws.send(JSON.stringify({reason: 'error', description: ex.message}));
                    }
                }
            });
        });
        return this.wss;
    } catch (ex) {
        // TODO: log error
//        console.log('asdfasdf');
//        console.log(ex);
        return null;
    }

};
