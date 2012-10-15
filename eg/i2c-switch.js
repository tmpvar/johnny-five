var five = require("../lib/johnny-five"),
    board = new five.Board();

board.on("ready", function() {

  var parent = (new five.I2CSwitch({
    device: 'PCA9548',
    freq : 1000
  }));

  parent.add({
    tick : function(fn) {
      console.log('this is what devices should implement inside the interval');
      fn && fn();
    }
  })

});
