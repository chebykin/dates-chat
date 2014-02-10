module.exports = {
    send: function (payload) {
        var sender = new Sender();
        

        if (typeof payload === 'undefined') {
            sender.payload_type = 'undefined';
        } if (typeof payload === 'object' && 'then' in payload && typeof payload.then === 'function') {
            sender.payload_type = 'promise';
            sender.query = payload;
        } else {
            sender.payload_type = 'other';
            sender.payload = payload;
        }

        return sender;
    },
    success: function (action, data) {
        return JSON.stringify({status: 'success', action: action, data: data});
    },
    error: function (message) {
        return JSON.stringify({reason: 'error', method: 'push', description: message});
    },
    rollback: function (contact_id, message) {
        return JSON.stringify({
            reason: 'rollback',
            method: 'push',
            payload: {
                description: message,
                contact_id: contact_id
            }
        });
    },
    update: function (action, data) {
        return JSON.stringify({action: action, data: data});
    }
};

var users = require('./user'),
    currentCollection = users.currentCollection,
    send;

function Sender() {
    this.errors = [];
    this.sockets = [];
    this.ids = [];
    this.mode = 'chat';
    this.only_once = false;
}

Sender.prototype.using = function (route) {
    var arr = route.split('#');

    if (arr.length === 2) {
        this.response = {
            reason: arr[0],
            method: arr[1]
        };
    } else {
        this.errors.push("Wrong route syntax");
    }

    return this.exec();
};

Sender.prototype.with_mode = function (mode) {
    this.mode = mode;
    return this;
};

Sender.prototype.only_once = function () {
    this.only_once = true;
    return this;
};


// executing functions:
Sender.prototype.to_user = function (user_id) {
    return this.to_users.apply(this, arguments);
};

Sender.prototype.to_users = function (user_ids) {
    this.ids = Array.isArray(user_ids) ? user_ids : [parseInt(user_ids, 10)];
    return this;
};

/**
 * @param [ws]
 */
Sender.prototype.to_socket = function (ws) {
    this.sockets = [ws];
    this.mode = 'all';
    return this;
};

Sender.prototype.from_collection = function (collection) {
    this.collection = collection;
    return this;
};

// do not call explicitly, use methods above
Sender.prototype.exec = function () {
    var deferred = Q.defer(),
        payload_deferred = Q.defer(),
        _responder = this;

    // check for errors
    if (this.errors.length > 0) {
        deferred.reject(this.errors[0]);
        return deferred.promise;
    }
    // get collection
    this.collection = this.collection || this.sockets.length ? this.sockets[0].collection : currentCollection(this.ids[0]);

    if (!this.sockets.length && !this.collection) {
        throw new Error('Empty collection for user ' + this.ids[0]);
    }

    // execute query and assign payload
    switch (this.payload_type) {
        case 'promise':
            this.payload.then(function (payload) {
                payload_deferred.resolve(payload);
            });
            break;
        case 'other':
            payload_deferred.resolve(this.payload);
            break;
        case 'undefined':
            payload_deferred.resolve(null);
            break;
        default:
            payload_deferred.reject(new Error('Wrong payload type'));
            break;
    }

    payload_deferred.promise
        .then(function (payload) {

            if (_responder.ids && _responder.ids.length > 0) {
                _responder.sockets = _responder.collection.all_websockets(_responder.ids);
            } else if (_responder.sockets.length === 0) {
                deferred.reject(new Error('There are no sockets to send payload'));
            }

            if (payload !== null) {
                _responder.response.payload = payload;
            }

            for (var sock in _responder.sockets) {
                if (_responder.sockets.hasOwnProperty(sock)) {
                    if (_responder.mode === 'all' || _responder.mode === _responder.sockets[sock].mode) {
                        _responder.sockets[sock].send(JSON.stringify(_responder.response));
                    }
                    if (_responder.only_once) {
                        break;
                    }
                }
            }


            deferred.resolve(_responder.response);
        });

    return deferred.promise;
};
