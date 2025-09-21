// Support for timing using T.start() and T.stop()
export var T = {
  stack: [],
  start: () => {
    T.stack.push(Date.now());
  },
  stop: () => Date.now() - T.stack.pop() + "ms",
};

function tick(msg) {
  var now = Date.now();
  var elapsed = tickTime ? " - " + (now - tickTime) + "ms" : "";
  tickTime = now;
  console.log((msg || "") + elapsed);
}

var tickTime = 0;
