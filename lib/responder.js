module.exports = {
    success: function (action, data) {
        var obj = {status: 'success', action: action, data: data};
        return JSON.stringify(obj);
    },
    error: function (action, data) {
        var obj = {status: 'error', action: action, data: data};
        return JSON.stringify(obj);
    },
    update: function (action, data) {
        var obj = {action: action, data: data};
        return JSON.stringify(obj);
    }
};