var sys      = require('sys');
var memcache = require('./memcache');

var mycb = function(data) {
    sys.debug('received: ' + data);
};

var onConnect = function() {
    mcClient.get('test xxx').addCallback(function(data) {
        sys.debug('recieved: ' + data);
    });
    
    mcClient.mc_delete('test').addCallback(function(data) {
        sys.debug('recieved: ' + data);
    }).addErrback(function(data) {
    	sys.debug('custom error handling');
    	mcClient.close();
    });
    
    // mcClient.query('get test');
};

mcClient = new memcache.Client();
mcClient.connect(onConnect);
