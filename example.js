var sys      = require('sys');
var memcache = require('./memcache');

var mycb = function(data) {
    sys.debug('received: ' + data);
};

var onConnect = function() {
    mcClient.get('test xxx').addCallback(function(data) {
        sys.debug('recieved: ' + data);
        mcClient.close();
    }).addErrback(function() {
        sys.debug('found error');
    });
    
    mcClient.mc_delete('test').addCallback(function(data) {
        sys.debug('recieved: ' + data);
        mcClient.close();
    });
    
    // mcClient.query('get test');
};

mcClient = new memcache.Client();
mcClient.connect(onConnect);
