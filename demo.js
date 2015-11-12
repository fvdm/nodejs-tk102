/*
  Start with:  node demo.js
  Telnet to:   telnet 127.0.0.1 1337
  Copy/paste:  1203292316,0031698765432,GPRMC,211657.000,A,5213.0247,N,00516.7757,E,0.00,273.30,290312,,,A*62,F,imei:123456789012345,123
*/

var tk102 = require ('./');

function output (name, data) {
  console.log ('\nEvent: ' + name);
  console.dir (data, {
    colors: String (process.env.TERM) .match (/color$/)
  });
}

tk102.createServer ({
  port: 1337
});

tk102.on ('log', output);
