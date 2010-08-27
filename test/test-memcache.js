/*
tests for expresso
*/

var sys      = require('sys');
var memcache = require('memcache');

mc = new memcache.Client();
mc.on('error', function(e){

	if (e.errno == 111){
		exports['startup test'] = function(assert){

			assert.ok(false, "You need to have a memcache server running on localhost:11211 for these tests to run");
		}
		return;
	}

	exports['startup test'] = function(assert){
		assert.ok(false, "Unexpected error during connection: "+sys.inspect(e));
	}
});
mc.connect();


mc.addHandler(function() {

	// test nonexistent key is null
	exports['test null value'] = function(assert, beforeExit) {
		var n = 0;
		mc.get('no such key', function(r) {
			assert.equal(null, r);
			n++;
		});
		
		beforeExit(function() {
			assert.equal(1, n);
		});
	};
	
	// test set, get and expires
	exports['test set, get, and expires'] = function(assert, beforeExit) {
		var n = 0;
		// set key
		mc.set('set1', 'asdf1', function() {
			n++;
			mc.get('set1', function(r) {
				// assert key is found
				assert.equal('asdf1', r);
				n++;
				// assert key expires after 1s
				setTimeout(function() {
					mc.get('set1', function(r) {
						mc.close();
						assert.equal(null, r);
						n++;
					});
				}, 1000);
			});
		}, 1);
		
		beforeExit(function() {
			assert.equal(3, n);
		});
	};

	// test set and delete
	exports['test set del'] = function(assert, beforeExit) {
		var n = 0;
		// set key
		mc.set('set2', 'asdf2', function() {
			n++;
			mc.get('set2', function(r) {
				// assert key is found
				assert.equal('asdf2', r);
				n++;
				// delete key
				mc.del('set2', function() {
					mc.get('set2', function(r) {
						// assert key is null
						assert.equal(null, r);
						n++;
					});
				});
			});
		}, 0);
		
		beforeExit(function() {
			assert.equal(3, n);
		});
	};
});
