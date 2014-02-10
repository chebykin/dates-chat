var Responder = module.exports = {};

var app = require('../app'),
    send = require('../lib/sender').send,
    currentCollection = require('./user').currentCollection;

Responder.respond = {
    to_user: function (user_id) {
        var response = new Response();

        response.user_id = user_id;
        response.collection = currentCollection(user_id);
        response.sockets = response.collection.all_websockets([user_id]);

        return response;
    },
    to_users: function (user_ids) {
        var response = new Response();

        response.collection = currentCollection(user_ids[0]);
        response.sockets = response.collection.all_websockets(user_ids);

        return response;
    },
    to_socket: function (socket) {
        var response = new Response();

        response.type = 'socket';
        response.user_id = socket.user_id;
        response.sockets.push(socket);
        response.collection = socket.collection;

        return response;
    }
};

function Response() {
    this.sockets = [];
}

Response.prototype.using = function (response_name) {
    var arr = response_name.split('#'),
        deferred = Q.defer();

    if (arr.length !== 2) {
        return deferred.reject(new Error("Wrong route syntax"));
    }

    this.controller_name = arr[0];
    this.action_name = arr[1];

    this.controller = app.controller(this.controller_name);

    if (typeof this.controller === 'undefined') {
        return deferred.reject(new Error("Wrong controller name"));
    }

    if (!(this.action_name in this.controller.response)) {
        return deferred.reject(new Error("Wrong action name"));
    }

    this.action = this.controller.response[this.action_name];

    this.exec();
};

Response.prototype.exec = function () {
    var _response = this,
        response_action;

    switch (this.type) {
        case 'socket':
            response_action = this.action(this.sockets[0]);
            break;
        case 'user':
            response_action = this.action(this.user_id);
            break;
        case 'users':
            response_action = this.action(this.user_ids);
            break;
    }

    if (!response_action || !response_action.length) {
        return;
    }

    var l = response_action.length,
        route,
        i;

    for (i = 0; i < l; i++) {
        for (route in response_action[i]) {
            if (response_action[i].hasOwnProperty(route)) {
                action2data(i, route);
            }
        }
    }

    function action2data(index, route) {
        response_action[index][route]
            .then(function (data) {
                data2sockets(data, route);
            });
    }

    function data2sockets(data, route) {
        var r = _response,
            l = r.sockets.length,
            i;

        for (i = 0; i < l; i++) {
            send(data).to_socket(r.sockets[i]).using(route);
        }
    }
};
