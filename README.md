node.js memcached client
========================

A pure-JavaScript Memcache library for node.


Tests
-----

To run the test suite, first insall <a href="http://github.com/visionmedia/expresso">expresso</a>, then run <code>make test</code>.


Usage
-----

Create a Client object to start working.
Host and port can be passed to the constructor or set afterwards.
They have sensible defaults.

	var memcache = require('./memcache');

	var client = new memcache.Client(port, host);
	client.port = 11211;
	client.host = 'loalhost';

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

	client.on('error' function(e){
		// there was an error - exception is 1st argument
	});

After connecting, you can start to make requests.

	client.get('key', function(result, error){

		// all of the callbacks have two arguments.
		// 'result' may contain things which aren't great, but
		// aren't really errors, like 'NOT_STORED'

	});

	client.set('key', 'value', function(success, error){

		// lifetime is optional. the default is
		// to never expire (0)

	}, lifetime);

	client.del('key', function(success, error){

		// delete a key from cache.
		// response?
	});

	client.version(function(version, error)){

		// grab the server version
	});


	// all of the different "store" operations
	// (lifetime & flags are both optional)
	client.set(key, value, callback, lifetime, flags);
	client.add(key, value, callback, lifetime, flags);
	client.replace(key, value, callback, lifetime, flags);
	client.append(key, value, callback, lifetime, flags);
	client.prepend(key, value, callback, lifetime, flags);
	client.cas(key, value, unique, callback, lifetime, flags);

	// increment and decrement
	// (value is optional, defaults to 1)
	client.increment('key', value, callback);
	client.decrement('key', value, callback);

Once you're done, close the connection.

	client.close();

	
