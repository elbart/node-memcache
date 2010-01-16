var sys      = require('sys');
var memcache = require('./memcache');

var mycb = function(data) {
    sys.debug('received: ' + data);
}

var onConnect = function() {
    mcClient.get('test', function (data) {
        sys.debug('received: ' + data);
        mcClient.close();
    });
};

mcClient = new memcache.Client();
mcClient.connect(onConnect);
