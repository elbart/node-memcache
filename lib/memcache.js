/**
 * Copyright (c) 2011 Tim Eggert
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 * @author Tim Eggert <tim@elbart.com>
 * @license http://www.opensource.org/licenses/mit-license.html MIT License
 */

var tcp = require('net'),
    sys = require('sys');
    
var crlf = "\r\n";
var crlf_len = crlf.length;

var error_replies = ['ERROR', 'NOT_FOUND', 'CLIENT_ERROR', 'SERVER_ERROR'];

var Client = exports.Client = function(port, host) {
    this.port = port || 11211;
    this.host = host || 'localhost';
    this.buffer = null;
	this.first_line = null;
    this.conn = null;
    this.sends = 0;
    this.replies = 0;
    this.callbacks = [];
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
	 
	    var that = this;
		this.conn.addListener("data", function (data) {
			if(that.buffer) {
				var tmp = new Buffer(that.buffer.length + data.length);
				that.buffer.copy(tmp);
				data.copy(tmp, that.buffer.length);
				that.buffer = tmp;
			}
			else {
				that.buffer = data;
			}
	    	self.recieves += 1;
	    	self.handle_received_data();
	    });
	 
	    this.conn.addListener("end", function () {
	    	if (self.conn && self.conn.readyState) {
	    		self.conn.end();
	        	self.conn = null;
	      	}
	    });
	 
	    this.conn.addListener("close", function () {
	    	self.conn = null;
	      	self.emit("close");
	    });

            this.conn.addListener("timeout", function () {
                self.conn = null;
                self.emit("timeout");
            });

            this.conn.addListener("error", function (ex) {
                self.conn = null;
                self.emit("error", ex);
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
        if (typeof handle !== 'undefined') {
            handle();
        }
    }
};

Client.prototype.query = function(query, type, callback) {
	this.callbacks.push({ type: type, fun: callback });
	this.sends++;
	this.conn.write(query + crlf);
};

Client.prototype.close = function() {
	if (this.conn && this.conn.readyState === "open") {
		this.conn.end();
		this.conn = null;
	}
};

Client.prototype.get = function(key, callback) {
	return this.query('get ' + key, 'get', callback);
};


// all of these store ops (everything bu "cas") have the same format
Client.prototype.set     = function(key, value, callback, lifetime, flags) { return this.store('set',     key, value, callback, lifetime, flags); }
Client.prototype.add     = function(key, value, callback, lifetime, flags) { return this.store('add',     key, value, callback, lifetime, flags); }
Client.prototype.replace = function(key, value, callback, lifetime, flags) { return this.store('replace', key, value, callback, lifetime, flags); }
Client.prototype.append  = function(key, value, callback, lifetime, flags) { return this.store('append',  key, value, callback, lifetime, flags); }
Client.prototype.prepend = function(key, value, callback, lifetime, flags) { return this.store('prepend', key, value, callback, lifetime, flags); }
Client.prototype.store   = function(cmd, key, value, callback, lifetime, flags) {

	if (typeof(callback) != 'function') {
		lifetime = callback;
		callback = null;
	}

	var set_flags = flags || 0;
	var exp_time  = lifetime || 0;
    var tml_buf = new Buffer(value.toString());
	var value_len = tml_buf.length || 0;
	var query = [cmd, key, set_flags, exp_time, value_len];

	return this.query(query.join(' ') + crlf + value, 'simple', callback);
};

// "cas" is a store op that takes an extra "unique" argument
Client.prototype.cas = function(key, value, unique, callback, lifetime, flags) {

	if (typeof(callback) != 'function') {
		lifetime = callback;
		callback = null;
	}

	var set_flags = flags || 0;
	var exp_time  = lifetime || 0;
	var value_len = value.length || 0;
	var query = ['cas', key, set_flags, exp_time, value_len, unique];

	return this.query(query.join(' ') + crlf + value, 'simple', callback);
};


Client.prototype.del = function(key, callback){
	sys.error("mc.del() is deprecated - use mc.delete() instead");
	return this.delete(key, callback); 
};

Client.prototype.delete = function(key, callback){
	return this.query('delete ' + key, 'simple', callback);
};

Client.prototype.version = function(callback) {
	return this.query('version', 'version', callback);
};

Client.prototype.increment = function(key, value, callback) {

	if (typeof(value) == 'function') {
		callback = value;
		value = 1;;
	}

	value = value || 1;
	return this.query('incr ' + key + ' ' + value, 'simple', callback);
};

Client.prototype.decrement = function(key, value, callback) {

	if (typeof(value) == 'function') {
		callback = value;
		value = 1;;
	}

	value = value || 1;
	return this.query('decr ' + key + ' ' + value, 'simple', callback);
};

Client.prototype.stats = function(type, callback){

	if (typeof(type) == 'function'){
		callback = type;
		type = null;
	}

	if (type){
		return this.query('stats '+type, 'stats', callback);
	}else{
		return this.query('stats', 'stats', callback);
	}
}

function bufferIndexOfCrLf(buffer, offset, length) {
	for(var p = offset; p < offset + length; p++) {
		if(buffer[p] == 0x0d && p + 1 < offset + length && buffer[p+1] == 0x0a) {
			return p;
		}
	}
	return -1;
}

Client.prototype.handle_received_data = function(){
	// There are several cases to be considered here:
	// 1) we have less that 1 line - wait for a full line of text
	// 2) we have 1+ lines of text, but the response is not complete yet (eg, 'get' of a large object) - continue waiting until we get the full object
	// 3) we have exactly one response in the buffer - the response will be processed, and buffer will be set to 'null' (next incoming data replaces it) - this is a common case and avaids unneeded copies
	// 4) we have more than one response in the buffer - the first response will be processed and Buffer.slice() will be used to move to the start of the next response
	while (this.buffer && this.buffer.length > 0){
		if(! this.first_line) {
			var crlf_at = bufferIndexOfCrLf(this.buffer, 0, this.buffer.length);
			// check that we have at-least a whole line in the buffer
			if (crlf_at == -1){
				// case #1 above (rare) - waiting for more data
				break;
			}

			this.first_line = this.buffer.toString('utf8', 0, crlf_at);
			this.buffer = this.buffer.slice(crlf_at + 2);
		}
		var result = this.determine_reply_handler(this.first_line, this.buffer);

		if (result == null){
			// case #2 above - waiting for more data
			break;
		}

		var result_value = result[0];
		var next_result_at = result[1];
		var result_error = result[2];

		// does the current message need more data than we have?
		// (this is how "get" ops ensure we've gotten all the data)
		if (next_result_at > this.buffer.length) {
			// case #2 above - waiting for more data
			break;
		}
		else if(next_result_at == this.buffer.length) {
			// case #3 above - exactly one response.
			this.first_line = null;
			this.buffer = null;
		}
		else {
			// case #4 above - part of a 2nd response left in buffer
			this.first_line = null;
			this.buffer = this.buffer.slice(next_result_at);
		}

		var callback = this.callbacks.shift();
		if (callback != null && callback.fun){
			this.replies++;
			callback.fun(result_error, result_value);
		}
	}
};

Client.prototype.determine_reply_handler = function (first_line, buffer){
	// determine errors
	for (var error_idx in error_replies){
		var error_indicator = error_replies[error_idx];
		if (first_line.indexOf(error_indicator) == 0) {
			return [null, 0, new Error(first_line)];
		}
	}

	// call the handler for the current message type
	var type = this.callbacks[0].type;
	if (type){
		return this['handle_' + type](first_line, buffer);
	}
	
	console.log("determine_reply_handler: returning null for no apparent reason");
	return null;
};

Client.prototype.handle_get = function(first_line, buffer) {
   	// Cases:
	// 1) key not found - first_line will just be "END\r\n"
	// 2) key found - first_line will be "VALUE key_name int_flags int_length\r\n", followed by exactly 'int_length' bytes, then "\r\nEND\r\n" (an additional 7 bytes)
	// 3) key found, but response incomplete - the number of bytes specified does not (yet) exist in the buffer.  wait for more data (by returning null here)
    
	if (first_line.indexOf('END') == 0) {
		// case #1 - return result=null
        return [null, 0, null];
    }
	
	var tokens = first_line.split(' ');
	var value = tokens[0];
	var key = tokens[1];
	var flags = tokens[2];
	var result_len = parseInt(tokens[3]);
	
	if (first_line.indexOf('VALUE') == 0 && buffer.length >= result_len + 7) {
		// case #2 - return result
		return [ buffer.slice(0, result_len), result_len + 7, null];
    } else {
    	// case #3 - need to wait for more data
		return null;
    }
};

Client.prototype.handle_stats = function(first_line, buffer){

	// special case - no stats at all
	if (first_line.indexOf('END') == 0){
		return [{}, 5];
	}

	var str = first_line + buffer.toString('utf8');
	// find the terminator
	var idx = str.indexOf('\r\nEND\r\n');
	if (idx == -1){
		// wait for more data if we don't have an end yet
		return null;
	}

	// read the lines
	var our_data = str.substr(0, idx+2);
	var out = {};
	var line = null;
	var i=0;
	while (line = readLine(our_data)){
		our_data = our_data.substr(line.length + 2);
		if (line.substr(0, 5) == 'STAT '){
			var idx2 = line.indexOf(' ', 5);
			var k = line.substr(5, idx2-5);
			var v = line.substr(idx2+1);
			out[k] = v;
		}
	}

	return [out, idx + 7, null];
};

Client.prototype.handle_simple = function(first_line, buffer){
	return [first_line, 0, null];
};

Client.prototype.handle_version = function(first_line, buffer){
	var indicator_len = 'VERSION '.length;
	var result_value  = first_line.substr(indicator_len);
	return [result_value, 0, null];
};

readLine = function(string){
	var line_len = string.indexOf(crlf);
	return string.substr(0, line_len);
};

