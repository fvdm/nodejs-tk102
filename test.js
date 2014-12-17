var app = require('./')


// handle exits
var errors = 0
process.on( 'exit', function() {
  if( errors == 0 ) {
    console.log('\n\033[1mDONE, no errors.\033[0m\n')
    process.exit(0)
  } else {
    console.log('\n\033[1mFAIL, '+ errors +' error'+ (errors > 1 ? 's' : '') +' occurred!\033[0m\n')
    process.exit(1)
  }
})

// prevent errors from killing the process
process.on( 'uncaughtException', function( err ) {
  console.log()
  console.error( err.stack )
  console.trace()
  console.log()
  errors++
})

// Queue to prevent flooding
var queue = []
var next = 0

function doNext() {
  next++
  if( queue[next] ) {
    queue[next]()
  }
}

// doTest( passErr, 'methods', [
//   ['feeds', typeof feeds === 'object']
// ])
function doTest( err, label, tests ) {
  if( err instanceof Error ) {
    console.error( label +': \033[1m\033[31mERROR\033[0m\n' )
    console.error( util.inspect(err, false, 10, true) )
    console.log()
    console.error( err.stack )
    console.log()
    errors++
  } else {
    var testErrors = []
    tests.forEach( function( test ) {
      if( test[1] !== true ) {
        testErrors.push(test[0])
        errors++
      }
    })

    if( testErrors.length == 0 ) {
      console.log( label +': \033[1mok\033[0m' )
    } else {
      console.error( label +': \033[1m\033[31mfailed\033[0m ('+ testErrors.join(', ') +')' )
    }
  }

  doNext()
}

// parser valid
queue.push( function() {
  var data = app.parse('1203292316,0031698765432,GPRMC,211657.000,A,5213.0247,N,00516.7757,E,0.00,273.30,290312,,,A*62,F,imei:123456789012345,123')
  doTest( data, 'parse valid', [
    ['type', data instanceof Object],
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
  ])
})

// parser fail
queue.push( function() {
  var data = app.parse('invalid input')
  doTest( data, 'parse fail', [
    ['type', data === null]
  ])
})


// Start the tests
queue[0]()
