/*
Name:         tk102 - test.js
Description:  Test script for TK102 GPS server for node.js
Author:       Franklin van de Meent (https://frankl.in)
Source:       https://github.com/fvdm/nodejs-tk102
Feedback:     https://github.com/fvdm/nodejs-tk102/issues
License:      Unlicense / Public Domain (see UNLICENSE file)
              (https://github.com/fvdm/nodejs-tk102/raw/master/UNLICENSE)
*/

var dotest = require ('dotest');
var app = require ('./');

// Str to work with
var input = '1203292316,0031698765432,GPRMC,211657.000,A,5213.0247,N,00516.7757,E,0.00,273.30,290312,,,A*62,F,imei:123456789012345,123';


// module
dotest.add ('Module', function () {
  dotest.test ()
    .isObject ('fail', 'exports', app)
    .isObject ('fail', '.settings', app && app.settings)
    .isFunction ('fail', '.event', app && app.event)
    .isFunction ('fail', '.createServer', app && app.createServer)
    .isFunction ('fail', '.fixGeo', app && app.fixGeo)
    .isFunction ('fail', '.checksum', app && app.checksum)
    .isFunction ('fail', '.parse', app && app.parse)
    .done ();
});

// checksum valid
dotest.add ('checksum valid', function () {
  var data = app.checksum (input);

  dotest.test ()
    .isBoolean ('fail', 'data', data)
    .isExactly ('fail', 'data', true)
    .done ();
});

// checksum invalid
dotest.add ('checksum invalid', function () {
  var data = app.checksum (input.toLowerCase ());

  dotest.test ()
    .isBoolean ('fail', 'data', data)
    .isExactly ('fail', 'data', false)
    .done ();
});

// parser valid
dotest.add ('parse valid', function () {
  var data = app.parse (input);

  dotest.test ()
    .isObject ('fail', 'data', data)
    .isExactly ('fail', 'data.raw', data && data.raw, input)
    .isBoolean ('fail', 'data.checksum', data && data.checksum)
    .isExactly ('fail', 'data.checksum', data && data.checksum, true)
    .isExactly ('fail', 'data.phone', data && data.phone, '0031698765432')
    .isExactly ('fail', 'data.imei', data && data.imei, '123456789012345')
    .isExactly ('fail', 'data.datetime', data && data.datetime, '2012-03-29 23:16')
    .isObject ('fail', 'data.gps', data && data.gps)
    .isExactly ('fail', 'data.gps.date', data && data.gps && data.gps.date, '2012-03-29')
    .isExactly ('fail', 'data.gps.time', data && data.gps && data.gps.time, '21:16:57.000')
    .isExactly ('fail', 'data.gps.signal', data && data.gps && data.gps.signal, 'full')
    .isExactly ('fail', 'data.gps.fix', data && data.gps && data.gps.fix, 'active')
    .isObject ('fail', 'data.geo', data && data.geo)
    .isExactly ('fail', 'data.geo.latitude', data && data.geo && data.geo.latitude, 52.217078)
    .isExactly ('fail', 'data.geo.longitude', data && data.geo && data.geo.longitudr, 5.279595)
    .isExactly ('fail', 'data.geo.bearing', data && data.geo && data.geo.bearing, 273)
    .isObject ('fail', 'data.speed', data && data.speed)
    .isExactly ('fail', 'data.speed.knots', data && data.speed && data.speed.knots, 0)
    .done ();
});

// parser fail
dotest.add ('parse fail', function () {
  var data = app.parse ('invalid input');

  dotest.test ()
    .isNull ('fail', 'data', data)
    .done ();
});


// Start the tests
dotest.run ();
