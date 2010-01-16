var sys = require('sys'),
    tcp = require('tcp');
    
var KILL_TIMEOUT = 2000;

exports.Client = function(port, host) {
    var
        host = host || 'localhost',
        port = port || 11211,
        queue = [],
        q_stack = [],
        kill_signal = false,
        auto_kill_pid = 0;

    var connection = tcp.createConnection(port, host);
    
    connection.addListener('receive', function(data) {
        var callback = q_stack.shift();
        callback(data);
        if (kill_signal && q_stack.length == 0) {
            connection.close();
            connection = null;
            if (auto_kill_pid != 0) {
                clearTimeout(auto_kill_pid);
            }
        }
    });

    connection.addListener('connect', function() {
        connection.setNoDelay();
        connection.setTimeout(0);
        var q = null;
        while ((q = queue.shift())) {
            sys.puts('... loading from queue command ' + q);
            connection.send(q);
        }
        connection.send(q);
    });
    
    return {

        query: function(q, callback) {
            var data = q + '\r\n';
            q_stack.push(callback || function() {});
            sys.debug(q_stack);
            if (connection.readyState == 'open') {
                connection.send(data);
            } else {
                queue.push(data);
            }
        },

        close: function() {
            if (q_stack.length) {
                // We are still waiting for some server responses. Handle them, then 
                // kill the connection.
                kill_signal = true;

                // Kill anyway after KILL_TIMEOUT seconds.
                auto_kill_pid = setTimeout(function() {
                    if (connection != null) {
                            connection.close();
                            connection = null;
                        }
                }, KILL_TIMEOUT);
            } else {
                connection.close();
                connection = null;
            }
        }
    }
}