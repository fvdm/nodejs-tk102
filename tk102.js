/*
Name:         tk102
Description:  TK102 GPS server for Node.js
Author:       Franklin van de Meent (https://frankl.in)
Source:       https://github.com/fvdm/nodejs-tk102
Feedback:     https://github.com/fvdm/nodejs-tk102/issues
License:      Unlicense / Public Domain (see UNLICENSE file)
              (https://github.com/fvdm/nodejs-tk102/raw/master/UNLICENSE)
*/

var net = require ('net');
var EventEmitter = require ('events') .EventEmitter;
var tk102 = new EventEmitter ();

// defaults
tk102.settings = {
  ip: '0.0.0.0',
  port: 0, // 0 = random, see `listening` event
  connections: 10,
  timeout: 10
};


// device data
var specs = [
  // 1203292316,0031698765432,GPRMC,211657.000,A,5213.0247,N,00516.7757,E,0.00,273.30,290312,,,A*62,F,imei:123456789012345,123
  function (raw) {
    var result = null;
    try {
      var raw = raw.trim ();
      var str = raw.split (',');

      if (str.length === 18 && str [2] === 'GPRMC') {
        var datetime = str [0] .replace (/([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})/, function (s, y, m, d, h, i) {
          return '20'+ y +'-'+ m +'-'+ d +' '+ h +':'+ i;
        });

        var gpsdate = str [11] .replace (/([0-9]{2})([0-9]{2})([0-9]{2})/, function (s, d, m, y) {
          return '20'+ y +'-'+ m +'-'+ d;
        });

        var gpstime = str [3] .replace (/([0-9]{2})([0-9]{2})([0-9]{2})\.([0-9]{3})/, function (s, h, i, s, ms) {
          return h +':'+ i +':'+ s +'.'+ ms
        });

        result = {
          'raw': raw,
          'datetime': datetime,
          'phone': str [1],
          'gps': {
            'date': gpsdate,
            'time': gpstime,
            'signal': str [15] == 'F' ? 'full' : 'low',
            'fix': str [4] == 'A' ? 'active' : 'invalid'
          },
          'geo': {
            'latitude': tk102.fixGeo (str [5], str [6]),
            'longitude': tk102.fixGeo (str [7], str [8]),
            'bearing': parseInt (str [10])
          },
          'speed': {
            'knots': Math.round (str [9] * 1000) / 1000,
            'kmh': Math.round (str [9] * 1.852 * 1000) / 1000,
            'mph': Math.round (str [9] * 1.151 * 1000) / 1000
          },
          'imei': str [16] .replace ('imei:', '')
        };
      }
    }
    catch (e) {}
    return result;
  }
];

// Catch uncaught exceptions (server kill)
process.on ('uncaughtException', function (err) {
  var error = new Error ('uncaught exception');
  error.error = err;
  console.trace (error);
});

// Create server
tk102.createServer = function (vars) {
  // override settings
  if( typeof vars === 'object' && Object.keys (vars) .length >= 1 ) {
    for (var key in vars) {
      tk102.settings [key] = vars [key];
    }
  }

  // start server
  tk102.server = net.createServer (function (socket) {
    // socket idle timeout
    if (tk102.settings.timeout > 0) {
      socket.setTimeout (tk102.settings.timeout * 1000, function () {
        tk102.emit ('timeout', socket);
        socket.end ();
      });
    }
  }) .listen (tk102.settings.port, tk102.settings.ip, function () {
    // server ready
    tk102.emit ('listening', tk102.server.address ());
  });

  // maximum number of slots
  tk102.server.maxConnections = tk102.settings.connections;

  // inbound connection
  tk102.server.on ('connection', function (socket) {
    tk102.emit ('connection', socket);
    socket.setEncoding ('utf8');
    var data = [];
    var size = 0;

    socket.on ('data', function (ch) {
      tk102.emit ('data', ch);
      data.push (ch);
      size += ch.length;
    });

    socket.on( 'close', function() {
      data = Buffer.concat (data, size).toString ('utf8');
      var gps = {};
      if (data != '') {
        var gps = tk102.parse (data);
        if (gps) {
          tk102.emit ('track', gps);
        } else {
          var err = new Error ('Cannot parse GPS data from device');
          err.reason = err.message;
          err.socket = socket;
          err.input = data;
          tk102.emit ('fail', err);
        }
      }
    });

    // error
    socket.on ('error', function (error) {
      var err = new Error ('Socket error');
      err.reason = err.message;
      err.socket = socket;
      err.settings = tk102.settings;
      tk102.emit ('error', err);
    });
  });

  tk102.server.on ('error', function (error) {
    if (error === 'EADDRNOTAVAIL') {
      var err = new Error ('IP or port not available');
    } else {
      var err = new Error ('Server error');
    }

    err.reason = err.message;
    err.input = tk102.settings;
    tk102.emit ('error', err);
  });
};

// Parse GPRMC string
tk102.parse = function (raw) {
  var data = null;
  var i = 0;
  while (data === null && i < specs.length) {
    data = specs [i] (raw);
    i++;
  }
  return data;
};

// Clean geo positions, with 6 decimals
tk102.fixGeo = function (one, two) {
  var minutes = one.substr (-7, 7);
  var degrees = parseInt (one.replace (minutes, ''), 10);
  var one = degrees + (minutes / 60);
  var one = parseFloat ((two === 'S' || two === 'W' ? '-' : '') + one);
  return Math.round (one * 1000000) / 1000000;
};

// ready
module.exports = tk102;
