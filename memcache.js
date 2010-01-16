var tcp = require('tcp'),
    sys = require('sys');

var Client = exports.Client = function(port, host) {
    this.port = port || 11211;
    this.host = host || 'localhost';
    this.buffer = '';
    this.conn = null;
    this.sends = 0;
    this.receives = 0;
}

Client.prototype.connect = function(callback) {
    var self  = this;
    
    this.conn = tcp.createConnection(this.port, this.host);
    
    this.conn.addListener('connect', function() {
          callback();
      });

    this.conn.addListener('receive', function(data) {
        self.buffer += data;
        self.receives += 1;
        sys.debug(data + 'xxxxxxxxxx');
    });

    this.conn.addListener('close', function() {
        sys.debug('receives: ' + self.receives + ' --- sends: ' + self.sends);
        sys.puts('bye bye');
    });
};

Client.prototype.query = function(q, callback) {
    var self  = this;
    var data = q + '\r\n';
    self.sends += 1;
    this.conn.send(data);
};

Client.prototype.close = function() {
    this.conn.close();
    this.conn = null;
};