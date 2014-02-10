/* global require:false, module:true*/
var chat = require('./lib/chat'),
    app = chat();

module.exports = app;

var config = require('./config'),
    messages_controller = require('./controllers/messages_controller'),
    sessions_controller = require('./controllers/sessions_controller'),
    settings_controller = require('./controllers/settings_controller'),
    dialogs_controller= require('./controllers/dialogs_controller'),
    recent_users_controller = require('./controllers/recent_users_controller'),
    online_users_controller = require('./controllers/online_users_controller'),
    util = require('util'),
    men = require('./lib/user').men,
    women = require('./lib/user').women;

app.use('messages', messages_controller);
app.use('sessions', sessions_controller);
app.use('settings', settings_controller);
app.use('dialogs', dialogs_controller);
app.use('recent_users', recent_users_controller);
app.use('online_users', online_users_controller);

app.listen({port: config.ports.websocket});

//setInterval(function () {
//    men.tick_update_online_users();
//    women.tick_update_online_users();
//}, config.online_check_interval);

// TODO: Cam online status.
