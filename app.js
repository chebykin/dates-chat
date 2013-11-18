/* global require:false, module:true*/

/*
 * current - current role
 * opposite - opposite role
 *
 * We don't use listening for becoming online/going offline events, because if it will be a lot of users, than per one
 * second there can be a lot login/logout events. We are not so paranoiac of precision of events. 2-3 seconds is enough.
 */

var config = require('./config')[process.env.NODE_ENV],
    chat = require('./lib/chat'),
    app = chat(),
    messages_actions = require('./actions/messages'),
    sessions_actions = require('./actions/sessions'),
    util = require('util'),
    men = require('./lib/user').men,
    women = require('./lib/user').women;

module.exports = app;

app.use('messages', messages_actions);
app.use('sessions', sessions_actions);

app.listen({port: config.websocket_port});

setInterval(function () {
    men.tick_update_online_users();
    women.tick_update_online_users();
}, config.online_check_interval);

// TODO: Cam online status.