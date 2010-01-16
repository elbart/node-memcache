var tcp = require('tcp'),
    sys = require('sys');
    
var crlf = "\r\n";
var crlf_len = 2;

var Client = exports.Client = function(port, host) {
    this.port = port || 11211;
    this.host = host || 'localhost';
    this.buffer = '';
    this.conn = null;
    this.sends = 0;
    this.receives = 0;
    this.callbacks = [];
}

sys.inherits(Client, process.EventEmitter);

Client.prototype.connect = function(callback) {
    var self  = this;
    this.conn = tcp.createConnection(this.port, this.host);
    
    this.conn.addListener('connect', function() {
        self.emit('connect');
        if (typeof(callback) === 'function') {
            callback();
        }
    });

    this.conn.addListener('receive', function(data) {
        self.buffer += data;
        self.receives += 1;
        self.handle_received_data(self.buffer);
    });

    this.conn.addListener('close', function() {
        sys.debug('receives: ' + self.receives + ' --- sends: ' + self.sends);
        self.emit('close');
    });
};

Client.prototype.query = function(q, callback) {
    var self  = this;
    var data = q + crlf;
    self.sends += 1;
    this.conn.send(data);
};

Client.prototype.close = function() {
    this.conn.close();
    this.conn = null;
};

Client.prototype.get = function(key, callback) {
    this.callbacks.push({type : 'get', fn : callback});
    this.query('get ' + key);
};

Client.prototype.handle_received_data = function (buffer) {    
    while (buffer.length > 0) {
        var result = this.handle_get(buffer);
        var result_value = result[0];
        var next_result_at = result[1]
        
        buffer = buffer.substr(next_result_at);
        
        var callback = this.callbacks.shift();
        if (typeof(callback.fn) === 'function') {
            callback.fn(result_value);
        }
    }
}

Client.prototype.handle_get = function(buffer) {
    var next_result_at = 0;
    var result_value = '';
    var end_indicator_len = 3;
    
    if (buffer.indexOf('END') == 0) {
        return [result_value, end_indicator_len];
    } else {
        var first_line_len = buffer.indexOf(crlf) + crlf_len;
        var result_len     = buffer.substr(0, first_line_len).split(' ')[3];
        result_value       = buffer.substr(first_line_len, result_len);
        return [result_value, first_line_len + parseInt(result_len ) + crlf_len + end_indicator_len + crlf_len];
    }
};

