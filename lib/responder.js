module.exports = {
    success: function (action, data) {
        var obj = {status: 'success', action: action, data: data};
        return JSON.stringify(obj);
    },
    error: function (message) {
        var obj = {reason: 'error', method: 'push', description: message};
        return JSON.stringify(obj);
    },
    rollback: function (contact_id, message) {
        var obj = {
            reason: 'rollback',
            method: 'push',
            payload: {
                description: message,
                contact_id: contact_id
            }
        };
        return JSON.stringify(obj);
    },
    update: function (action, data) {
        var obj = {action: action, data: data};
        return JSON.stringify(obj);
    }
};