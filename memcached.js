var sys = require('sys'),
    tcp = require('tcp');
    
var KILL_TIMEOUT = 2000;

exports.Client = function() {
    var connection = tcp.createConnection(11211);
    
    var queue = [];
    var q_stack = [];
    var kill_signal = false;
    var auto_kill_pid = 0;
    
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

    connection.addListener("eof", function () {
        this.close();
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

        /**
         *  Query the  FleetDB server. The optional ´´callback´´ is called when
         *  the server returns a response.
         */
        query: function(q, callback) {
            var data = q + '\r\n';
            q_stack.push(callback || function() {});
            if (connection.readyState == 'open') {
                connection.send(data);
            } else {
                queue.push(data);
            }
        },

        /**
         *  Close the established connection with the server.
         */
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