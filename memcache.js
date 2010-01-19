var tcp = require('tcp'),
    sys = require('sys');
    
var crlf = "\r\n";
var crlf_len = 2;

var error_replies = ['ERROR', 'NOT_FOUND', 'CLIENT_ERROR', 'SERVER_ERROR'];

var reply_indicators = {
    'get' : ['VALUE', 'END'],
    'set' : ['STORED', 'NOT_STORED', 'EXISTS'],
    'stats' : ['STATS'],
    'delete' : ['DELETED'],
    'version' : ['VERSION']
};

var Client = exports.Client = function(port, host) {
    this.port = port || 11211;
    this.host = host || 'localhost';
    this.buffer = '';
    this.conn = null;
    this.sends = 0;
    this.receives = 0;
    this.callbacks = [];
};

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
        sys.debug(data);
        self.buffer += data;
        self.receives += 1;
        self.handle_received_data(self.buffer);
    });

    this.conn.addListener('close', function() {
        sys.debug('receives: ' + self.receives + ' --- sends: ' + self.sends);
        self.emit('close');
    });
};

Client.prototype.query = function(query, type) {
    var self  = this;
    var data = query + crlf;
    var promise = new process.Promise();
    this.callbacks.push({type : type, promise: promise});
    self.sends += 1;
    this.conn.send(data);
    
    return promise;
};

Client.prototype.close = function() {
    this.conn.close();
    this.conn = null;
};

Client.prototype.get = function(key) {
    return this.query('get ' + key, 'get');
};

Client.prototype.mc_delete = function(key) {
	return this.query('delete ' + key, 'delete');
};

Client.prototype.handle_received_data = function (buffer) {
    var self = this;
    while (self.buffer.length > 0) {
        var result = this.determine_reply_handler(self.buffer);
        var result_value = result[0];
        var next_result_at = result[1];
        var callback = this.callbacks.shift();
        
        if (result_value === null) {
            callback.promise.emitError('server replied with error');
        }
        
        self.buffer = self.buffer.substr(next_result_at);
        
        if (callback && typeof(callback.promise) === 'function') {
            callback.promise.emitSuccess(result_value);
        }
    }
};

Client.prototype.determine_reply_handler = function (buffer) {
    // determine errors
    for (var error_idx in error_replies) {
        var error_indicator = error_replies[error_idx];
        if (buffer.indexOf(error_indicator) == 0) {
            return this.handle_error(buffer);
        }
    }
    
    // determine normal reply handler
    for (var method in reply_indicators) {
        for (var indicator in reply_indicators[method]) {
            var current_indicator = reply_indicators[method][indicator];
            if (buffer.indexOf(current_indicator) == 0) {
                sys.debug('calling ' + 'handle_' + method);
                return this['handle_' + method](buffer);
            }
        }
    }
    
    // no handler determined yet -> throw an error
    throw new Error('no handler found for server response');
};

Client.prototype.handle_get = function(buffer) {
    var next_result_at = 0;
    var result_value = '';
    var end_indicator_len = 3;
    
    if (buffer.indexOf('END') == 0) {
        return [result_value, end_indicator_len + crlf_len];
    } else {
        var first_line_len = buffer.indexOf(crlf) + crlf_len;
        var result_len     = buffer.substr(0, first_line_len).split(' ')[3];
        result_value       = buffer.substr(first_line_len, result_len);
        return [result_value, first_line_len + parseInt(result_len ) + crlf_len + end_indicator_len + crlf_len];
    }
};

Client.prototype.handle_delete = function(buffer) {
    var result_value = 'DELETED';
    return [result_value, result_value.length + crlf_len];
};

Client.prototype.handle_error = function(buffer) {
    sys.debug('handling error');
    line = readLine(buffer);
    
    return [null, (line.length + crlf_len)];
};

readLine = function(string) {
    var line_len = string.indexOf(crlf);
    return string.substr(0, line_len);
};
