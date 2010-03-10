var tcp = require('tcp'),
    sys = require('sys');
    
var crlf = "\r\n";
var crlf_len = crlf.length;

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
    this.replies = 0;
    this.handles = [];
};

sys.inherits(Client, process.EventEmitter);

Client.prototype.connect = function () {
	if (!this.conn) {
	    this.conn = new tcp.createConnection(this.port, this.host);
		var self = this;
	    this.conn.addListener("connect", function () {
	        this.setTimeout(0);          // try to stay connected.
	        this.setNoDelay();
		  	self.emit("connect");
	  		self.dispatchHandles();
	    }); 
	 
	    this.conn.addListener("data", function (data) {
	    	self.buffer += data;
            // sys.debug(data);
	    	self.recieves += 1;
	    	self.handle_received_data();
	    });
	 
	    this.conn.addListener("end", function () {
	    	if (self.conn && self.conn.readyState) {
	    		self.conn.close();
	        	self.conn = null;
	      	}
	    });
	 
	    this.conn.addListener("close", function () {
	    	self.conn = null;
	      	self.emit("close");
	    });
    }
};

Client.prototype.addHandler = function(callback) {
    this.handles.push(callback);
    
    if (this.conn.readyState == 'open') {
        this.dispatchHandles();
    }
};

Client.prototype.dispatchHandles = function() {
    for (var i in this.handles) {
        var handle = this.handles.shift();
        // sys.debug('dispatching handle ' + handle);
        handle();
    }
};

Client.prototype.query = function(query, type, callback) {
    var self  = this;
    var data = query + crlf;
    this.callbacks.push({ type: type, fun: callback });
    self.sends += 1;
    this.conn.write(data);
};

Client.prototype.close = function(idx) {
	if (this.conn && this.conn.readyState === "open") {
		this.conn.close();
	    this.conn = null;
	}
};

Client.prototype.get = function(key, callback) {
    return this.query('get ' + key, 'get', callback);
};

Client.prototype.set = function(key, value, callback, lifetime) {
    if (typeof(callback) != 'function') {
        lifetime = callback;
        callback = null;
    }
        
	var exp_time  = lifetime || 0;
	var value_len = value.length || 0;
	var query = 'set ' + key + ' 0 ' + exp_time + ' ' + value_len + crlf + value;

    return this.query(query, 'set', callback);
};

Client.prototype.del = function(key, callback) {
	return this.query('delete ' + key, 'delete', callback);
};

Client.prototype.version = function(callback) {
	return this.query('version', 'version', callback);
};

Client.prototype.increment = function(key, value, callback) {
	value = value || 1;
	return this.query('incr ' + key + ' ' + value, 'incr', callback);
};

Client.prototype.decrement = function(key, value, callback) {
	value = value || 1;
	return this.query('decr ' + key + ' ' + value, 'decr', callback);
};

Client.prototype.handle_received_data = function () {
    var self = this;
    
    while (this.buffer.length > 0) {
        var result = this.determine_reply_handler(this.buffer);
        
        if (result == null) {
        	break;
        }
        
        var result_value = result[0];
        var next_result_at = result[1];
        
        if (next_result_at > this.buffer.length) {
        	break;
        }
        
        var callback = this.callbacks.shift();
        
        if (result_value === null) {
            throw "Error";
        }
        
        this.buffer = this.buffer.substring(next_result_at);
        if (callback.fun) {
        	this.replies += 1;
            callback.fun(result_value);
        }
    }
};

Client.prototype.determine_reply_handler = function (buffer) {
	var crlf_at = buffer.indexOf(crlf);
	if (crlf_at == -1) {
		return null;
	}
	
	var first_line = buffer.substr(0, crlf_at);
	if (parseInt(first_line) == first_line) {
		return this.handle_integer(buffer, crlf_at);
	}
		
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
                return this['handle_' + method](buffer);
            }
        }
    }
    
    return null;
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

Client.prototype.handle_set = function(buffer) {
    var result_value = 'STORED';
    return [result_value, result_value.length + crlf_len];
};

Client.prototype.handle_version = function(buffer) {
	var line_len      = buffer.indexOf(crlf);
	var indicator_len = 'VERSION '.length;
    var result_value  = buffer.substr(indicator_len, (line_len - indicator_len));
    return [result_value, line_len + crlf_len];
};

Client.prototype.handle_integer = function(buffer, line_len) {
    var result_value  = buffer.substr(0, line_len);
    return [result_value, line_len + crlf_len];
};

Client.prototype.handle_error = function(buffer) {
    line = readLine(buffer);
    
    return [null, (line.length + crlf_len)];
};

readLine = function(string) {
    var line_len = string.indexOf(crlf);
    return string.substr(0, line_len);
};

