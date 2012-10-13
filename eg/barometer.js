var five = require("../lib/johnny-five"),
    // or "./lib/johnny-five" when running from the source
    board = new five.Board();

board.on("ready", function() {

  // Create an Led on pin 13 and strobe it on/off
  // Optionally set the speed; defaults to 100ms
  var barometer = (new five.Barometer({
    device: 'MPL115A2',
    freq: 1000,
    temperature : true,
    pressure : true
  }));

  var last = {};
  barometer.on('temperature', function(temp) {
    if (last.temperature && last.temperature !== temp) {
      console.log('the temperature is now ' + temp + 'C!');
    }
    last.temperature = temp;
  });

  barometer.on('pressure', function(pressure) {
    if (last.pressure && last.pressure !== pressure) {
      console.log('pressure', pressure + 'kpa');
    }
    last.pressure = pressure;
  });

});