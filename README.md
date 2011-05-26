node.js memcached client
========================

A pure-JavaScript memcached library for node.


Tests
-----

To run the test suite, first insall <a href="http://github.com/visionmedia/expresso">expresso</a>,
then run <code>make test</code>.

If you have <a href="http://github.com/visionmedia/node-jscoverage">node-jscoverage</a> you can
also <code>make test-cov</code> for coverage, but that's pretty nerdy.


Usage
-----

Create a Client object to start working.
Host and port can be passed to the constructor or set afterwards.
They have sensible defaults.

	var memcache = require('./memcache');

	var client = new memcache.Client(port, host);
	client.port = 11211;
	client.host = 'localhost';

The Client object emits 4 important events - connect, close, timeout and error.

	client.on('connect', function(){
		// no arguments - we've connected
	});

	client.on('close', function(){
		// no arguments - connection has been closed
	});

	client.on('timeout', function(){
		// no arguments - socket timed out
	});

	client.on('error', function(e){
		// there was an error - exception is 1st argument
	});

After connecting, you can start to make requests.

	client.get('key', function(error, result){

		// all of the callbacks have two arguments.
		// 'result' may contain things which aren't great, but
		// aren't really errors, like 'NOT_STORED'

	});

	client.set('key', 'value', function(error, result){

		// lifetime is optional. the default is
		// to never expire (0)

	}, lifetime);

	client.delete('key', function(error, result){

		// delete a key from cache.
	});

	client.version(function(error, result)){

		// grab the server version
	});


There are all the commands you would expect.

	// all of the different "store" operations
	// (lifetime & flags are both optional)
	client.set(key, value, callback, lifetime, flags);
	client.add(key, value, callback, lifetime, flags);
	client.replace(key, value, callback, lifetime, flags);
	client.append(key, value, callback, lifetime, flags);
	client.prepend(key, value, callback, lifetime, flags);
	client.cas(key, value, unique, callback, lifetime, flags);

	// increment and decrement (named differently to the server commands - for now!)
	// (value is optional, defaults to 1)
	client.increment('key', value, callback);
	client.decrement('key', value, callback);

	// statistics. the success argument to the callback
	// is a key=>value object
	client.stats(callback);
	client.stats('settings', callback);
	client.stats('items', callback);
	client.stats('mongeese', callback);

Once you're done, close the connection.

	client.close();

There might be bugs. I'd like to know about them.

I bet you also want to read the <a href="http://github.com/memcached/memcached/blob/master/doc/protocol.txt">memcached 
protocol doc</a>. It's exciting! It also explains possible error messages.
