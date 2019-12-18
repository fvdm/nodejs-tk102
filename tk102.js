/*
Name:         tk102
Description:  TK102 GPS server for Node.js
Author:       Franklin van de Meent (https://frankl.in)
Source:       https://github.com/fvdm/nodejs-tk102
Feedback:     https://github.com/fvdm/nodejs-tk102/issues
License:      Unlicense / Public Domain (see UNLICENSE file)
              (https://github.com/fvdm/nodejs-tk102/raw/master/UNLICENSE)
*/


var net = require('net');
var dms2dec = require('dms2dec');
var sleep = require('system-sleep');
var EventEmitter = require('events').EventEmitter;
var tk102 = new EventEmitter();


// device data
var specs = [
  function (raw) {
    var result = null;
    var str = [];
    var datetime = '';
    var gpsdate = '';
    var gpstime = '';

    try {
      raw = raw.trim();
      str = raw.split(',');

      if (str.length === 18 && str [2] === 'GPRMC') {
        datetime = str [0].replace(/([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})([0-9]{2})/, function (s, y, m, d, h, i) {
          return '20' + y + '-' + m + '-' + d + ' ' + h + ':' + i;
        });

        gpsdate = str [11].replace(/([0-9]{2})([0-9]{2})([0-9]{2})/, function (s, d, m, y) {
          return '20' + y + '-' + m + '-' + d;
        });

        gpstime = str [3].replace(/([0-9]{2})([0-9]{2})([0-9]{2})\.([0-9]{3})/, function (s0, h, i, s, ms) {
          return h + ':' + i + ':' + s + '.' + ms;
        });

        result = {
          raw: raw,
          datetime: datetime,
          phone: str [1],
          gps: {
            date: gpsdate,
            time: gpstime,
            signal: str [15] === 'F' ? 'full' : 'low',
            fix: str [4] === 'A' ? 'active' : 'invalid'
          },
          geo: {
            latitude: tk102.fixGeo(str [5], str [6]),
            longitude: tk102.fixGeo(str [7], str [8]),
            bearing: parseInt(str [10], 10)
          },
          speed: {
            knots: Math.round(str [9] * 1000) / 1000,
            kmh: Math.round(str [9] * 1.852 * 1000) / 1000,
            mph: Math.round(str [9] * 1.151 * 1000) / 1000
          },
          imei: str [16].replace('imei:', ''),
          checksum: tk102.checksum(raw)
        };
      }
    } catch (e) {
      result = null;
    }

    return result;
  }
];

// defaults
tk102.settings = {
  ip: '0.0.0.0',
  port: 0,
  connections: 10,
  timeout: 10
};


/**
 * Emit an event
 * and duplicate to 'log' event
 *
 * @param   {string}  name   Event name
 * @param   {string}  value  Event value
 * @return  {void}
 */
tk102.event = function (name, value) {
  tk102.emit(name, value);
  tk102.emit('log', name, value);
};

// Catch uncaught exceptions (server kill)
process.on('uncaughtException', function (err) {
  var error = new Error('uncaught exception');

  error.error = err;
  console.log(error);
  tk102.event('error', error);
});

// Create server
tk102.createServer = function (vars) {
  var key;
  var Check;
  // override settings
  if (typeof vars === 'object' && Object.keys(vars).length >= 1) {
    for (key in vars) {
      tk102.settings [key] = vars [key];
    }
  }

  // start server
  tk102.server = net.createServer();

  // maximum number of slots
  tk102.server.maxConnections = tk102.settings.connections;

  // server started
  tk102.server.on('listening', function () {
    tk102.event('listening', tk102.server.address());
  });

  // inbound connection
  tk102.server.on('connection', function (socket) {
    var connection = tk102.server.address();

    connection.remoteAddress = socket.remoteAddress;
    connection.remotePort = socket.remotePort;

    tk102.event('connection', connection);
    socket.setEncoding('utf8');

    if (tk102.settings.timeout > 0) {
      socket.setTimeout(parseInt(tk102.settings.timeout * 1000, 10));
    }

    socket.on('timeout', function () {
      tk102.event('timeout', connection);
      socket.destroy();
    });

    socket.on('data', function (data) {
      console.log(data);
      console.log("");
      var gps = {};
      var err = null;

      data = data.trim();
      tk102.event('data', data);

      if (data !== '') {
        // init
        if (data.substr(0, 2) == '##') {

          console.log(data)
          console.log("WRITE LOAD");
          socket.write('LOAD');

          sleep(1 * 1000);

          console.log("WRITE ON");
          socket.write('ON');

          sleep(1 * 1000);
          console.log("SENDING **");
          socket.write('**,imei:864180031021079,B')

        } else {

          console.log('DATA :' + data)
          if (data.substring(13, 17) == "BP00") {
            socket.write("ON");
            console.log("SERVER : ON");
          }
          //NMEA SIMULATOR CHROME EXTENSIONS SUPPORT
          if (data.substring(1, 6) == 'GPRMC') {

            var latdeg = data.substring(20, 22) * 1;
            var latmin = data.substring(22, 24) * 1;
            var latsec = "0." + data.substring(25, 27);
            var latref = data.substring(28, 29);
            var londeg = data.substring(30, 33) * 1;
            var lonmin = data.substring(33, 35) * 1;
            var lonsec = "0." + data.substring(36, 38);
            var lonref = data.substring(39, 40);
            var latitude = latdeg + ((latmin + latsec) / 60);
            var longitude = londeg + ((lonmin + lonsec) / 60);

            var simulator = {
              "device_id": 'SIMNMEA',
              "type": data.substring(1, 6),
              "heure": data.substring(7, 17),
              "latitude": latitude,
              "latref": data.substring(28, 29),
              "longitude": longitude,
              "lonref": data.substring(39, 40),
              "vitesse": data.substring(41, 45),
            };
            socket.write("ON");
            console.log("SERVER : ON");
            console.log(simulator);


          }
          if (data.substring(13, 17) == 'BR00') {
            var dms = {
              "latdeg": data.substring(24, 26),
              "latmin": data.substring(26, 28),
              "latsec": "0" + data.substring(28, 32),
              "latRef": data.substring(33, 34),

              "londeg": data.substring(34, 37),
              "lonmin": data.substring(37, 39),
              "lonsec": "0" + data.substring(39, 44),
              "lonRef": data.substring(44, 45),
            };
            var latitude = dms.latdeg * 1 + ((dms.latmin * 1 + dms.latsec * 1) / 60);
            var longitude = dms.londeg * 1 + ((dms.lonmin * 1 + dms.lonsec * 1) / 60);
            var data = {
              "device_id": data.substring(1, 13),
              "date": data.substring(17, 23),
              "latitude": latitude,
              "longitude": longitude,
              "vitesse": parseFloat(data.substring(45, 50)),
              "time": data.substring(50, 56),
              "orientation": data.substring(56, 62),
              "io_state": data.substring(64, 71),
            };
            console.log(data);
          }
          gps = tk102.parse(data);
          if (gps) {
            tk102.event('track', gps);
          } else {
            err = new Error('Cannot parse GPS data from device');
            err.reason = err.message;
            err.input = data;
            err.connection = connection;

            tk102.event('fail', err);
          }
        }
      }
    });
    socket.on('close', function (hadError) {
      connection.hadError = hadError;
      tk102.event('disconnect', connection);
    });

    // error
    socket.on('error', function (error) {
      var err = new Error('Socket error');

      err.reason = error.message;
      err.socket = socket;
      err.settings = tk102.settings;

      tk102.event('error', err);
    });
  });

  tk102.server.on('error', function (error) {
    var err = new Error('Server error');

    if (error === 'EADDRNOTAVAIL') {
      err = new Error('IP or port not available');
    }

    err.reason = error.message;
    err.input = tk102.settings;

    tk102.event('error', err);
  });

  // Start listening
  tk102.server.listen(tk102.settings.port, tk102.settings.ip);

  return tk102;
};

// Parse GPRMC string
tk102.parse = function (raw) {
  var data = null;
  var i = 0;

  while (data === null && i < specs.length) {
    data = specs [i](raw);
    i++;
  }

  return data;
};

// Clean geo positions, with 6 decimals
tk102.fixGeo = function (one, two) {
  var minutes = one.substr(-7, 7);
  var degrees = parseInt(one.replace(minutes, ''), 10);

  one = degrees + (minutes / 60);
  one = parseFloat((two === 'S' || two === 'W' ? '-' : '') + one);

  return Math.round(one * 1000000) / 1000000;
};

// Check checksum in raw string
tk102.checksum = function (raw) {
  var str = raw.trim().split(/[,*#]/);
  var strsum = parseInt(str [15], 10);
  var strchk = str.slice(2, 15).join(',');
  var check = 0;
  var i;

  for (i = 0; i < strchk.length; i++) {
    check ^= strchk.charCodeAt(i);
  }

  check = parseInt(check.toString(16), 10);
  return (check === strsum);
};

// ready
module.exports = tk102;
