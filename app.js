/* global require:false, module:true*/
var chat = require('./lib/chat'),
    app = chat();

module.exports = app;

var config = require('./config'),
    messages_controller = require('./controllers/messages_controller'),
    sessions_controller = require('./controllers/sessions_controller'),
    settings_controller = require('./controllers/settings_controller'),
    dialogs_controller= require('./controllers/dialogs_controller'),
    webcams_controller= require('./controllers/webcams_controller'),
    recent_users_controller = require('./controllers/recent_users_controller'),
    online_users_controller = require('./controllers/online_users_controller'),
    respond = require('./lib/responder').respond,
    util = require('util'),
    men = require('./lib/user').men,
    women = require('./lib/user').women;

app.use('messages', messages_controller);
app.use('sessions', sessions_controller);
app.use('settings', settings_controller);
app.use('dialogs', dialogs_controller);
app.use('webcams', webcams_controller);
app.use('recent_users', recent_users_controller);
app.use('online_users', online_users_controller);

app.listen({port: config.ports.websocket});

setInterval(function () {
    respond.to_collection(men).using('online_users#tick');
    respond.to_collection(women).using('online_users#tick');
    respond.to_collection(men).using('webcams#tick');
    respond.to_collection(women).using('webcams#tick');
}, config.intervals.online_check_interval);
// TODO: Cam online status.
