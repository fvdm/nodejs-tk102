/*
Name:         tk102 - test.js
Description:  Test script for TK102 GPS server for node.js
Author:       Franklin van de Meent (https://frankl.in)
Source:       https://github.com/fvdm/nodejs-tk102
Feedback:     https://github.com/fvdm/nodejs-tk102/issues
License:      Unlicense / Public Domain (see UNLICENSE file)
              (https://github.com/fvdm/nodejs-tk102/raw/master/UNLICENSE)
*/

var app = require ('./');
var errors = 0;
var queue = [];
var next = 0;

// Str to work with
var input = '1203292316,0031698765432,GPRMC,211657.000,A,5213.0247,N,00516.7757,E,0.00,273.30,290312,,,A*62,F,imei:123456789012345,123';

// handle exits

process.on ('exit', function () {
  if (errors === 0) {
    console.log ('\n\u001b[1mDONE, no errors.\u001b[0m\n');
    process.exit (0);
  } else {
    console.log ('\n\u001b[1mFAIL, ' + errors + ' error' + (errors > 1 ? 's' : '') + ' occurred!\u001b[0m\n');
    process.exit (1);
  }
});

// prevent errors from killing the process
process.on ('uncaughtException', function (err) {
  console.log ();
  console.log (err.stack);
  console.trace ();
  console.log ();
  errors++;
});

// Queue to prevent flooding
function doNext () {
  next++;
  if (queue [next]) {
    queue [next] ();
  }
}

// doTest( passErr, 'methods', [
//   ['feeds', typeof feeds === 'object']
// ])
function doTest (err, label, tests) {
  var testErrors = [];

  if (err instanceof Error) {
    console.log (label + ': \u001b[1m\u001b[31mERROR\u001b[0m\n');
    console.dir (err, { depth: 10, colors: true });
    console.log ();
    console.log (err.stack);
    console.log ();
    errors++;
  } else {
    tests.forEach (function (test) {
      if (test [1] !== true) {
        testErrors.push (test [0]);
        errors++;
      }
    });

    if (testErrors.length === 0) {
      console.log (label + ': \u001b[1m\u001b[32mok\u001b[0m');
    } else {
      console.log (label + ': \u001b[1m\u001b[31mfailed\u001b[0m (' + testErrors.join(', ') + ')');
    }
  }

  doNext ();
}

// checksum valid
queue.push (function () {
  var data = app.checksum (input);

  doTest (null, 'checksum valid', [
    ['type', typeof data === 'boolean'],
    ['value', data === true]
  ]);
});

// checksum invalid
queue.push (function () {
  var data = app.checksum (input.toLowerCase ());

  doTest (null, 'checksum invalid', [
    ['type', typeof data === 'boolean'],
    ['value', data === false]
  ]);
});

// parser valid
queue.push (function () {
  var data = app.parse (input);

  doTest (data, 'parse valid', [
    ['type', data instanceof Object],
    ['raw', data.raw === input],
    ['checksum type', typeof data.checksum === 'boolean'],
    ['checksum value', data.checksum === true],
    ['phone', data.phone === '0031698765432'],
    ['imei', data.imei === '123456789012345'],
    ['datetime', data.datetime === '2012-03-29 23:16'],
    ['gps type', data.gps instanceof Object],
    ['gps.date', data.gps.date === '2012-03-29'],
    ['gps.time', data.gps.time === '21:16:57.000'],
    ['gps.signal', data.gps.signal === 'full'],
    ['gps.fix', data.gps.fix === 'active'],
    ['geo type', data.geo instanceof Object],
    ['geo.latitude', data.geo.latitude === 52.217078],
    ['geo.longitude', data.geo.longitude === 5.279595],
    ['geo.bearing', data.geo.bearing === 273],
    ['speed type', data.speed instanceof Object],
    ['speed.knots', data.speed.knots === 0]
  ]);
});

// parser fail
queue.push (function () {
  var data = app.parse ('invalid input');

  doTest (data, 'parse fail', [
    ['type', data === null]
  ]);
});


// Start the tests
queue [0] ();
