import { getStateVar, setStateVar } from "../mapshaper-state";
import utils from "../utils/mapshaper-utils";

var LOGGING = false;
var STDOUT = false; // use stdout for status messages

// These three functions can be reset by GUI using setLoggingFunctions();
var _error = () => {
  var msg = utils.toArray(arguments).join(" ");
  throw new Error(msg);
};

var _stop = () => {
  throw new UserError(formatLogArgs(arguments));
};

var _interrupt = () => {
  throw new NonFatalError(formatLogArgs(arguments));
};

var _message = () => {
  logArgs(arguments);
};

function enableLogging() {
  LOGGING = true;
}

function loggingEnabled() {
  return !!LOGGING;
}

// Handle an unexpected condition (internal error)
export function error() {
  _error.apply(null, utils.toArray(arguments));
}

// Handle an error caused by invalid input or misuse of API
export function stop() {
  _stop.apply(null, utils.toArray(arguments));
}

function interrupt() {
  _interrupt.apply(null, utils.toArray(arguments));
}

// Print a status message
export function message() {
  _message.apply(null, messageArgs(arguments));
}

// A way for the GUI to replace the CLI logging functions
function setLoggingFunctions(message, error, stop) {
  _message = message;
  _error = error;
  _stop = stop;
}

// print a message to stdout
export function print() {
  STDOUT = true; // tell logArgs() to print to stdout, not stderr
  message.apply(null, arguments);
  STDOUT = false;
}

export function verbose() {
  // verbose can be set globally with the -verbose command or separately for each command
  if (getStateVar("VERBOSE") || getStateVar("verbose")) {
    message.apply(null, arguments);
  }
}

export function debug() {
  if (getStateVar("DEBUG") || getStateVar("debug")) {
    logArgs(arguments);
  }
}

function printError(err) {
  var msg;
  if (!LOGGING) return;
  if (utils.isString(err)) {
    err = new UserError(err);
  }
  if (err.name == "NonFatalError") {
    console.error(messageArgs([err.message]).join(" "));
  } else if (err.name == "UserError") {
    msg = err.message;
    if (!/Error/.test(msg)) {
      msg = "Error: " + msg;
    }
    console.error(messageArgs([msg]).join(" "));
    console.error("Run mapshaper -h to view help");
  } else {
    // not a user error (i.e. a bug in mapshaper)
    console.error(err);
    // throw err;
  }
}

function UserError(msg) {
  var err = new Error(msg);
  err.name = "UserError";
  return err;
}

function NonFatalError(msg) {
  var err = new Error(msg);
  err.name = "NonFatalError";
  return err;
}

function formatColumns(arr, alignments) {
  var widths = arr.reduce(
    (memo, line) =>
      line.map((str, i) => (memo ? Math.max(memo[i], str.length) : str.length)),
    null,
  );
  return arr
    .map((line) => {
      line = line.map((str, i) => {
        var rt = alignments && alignments[i] == "right";
        var pad = (rt ? str.padStart : str.padEnd).bind(str);
        return pad(widths[i], " ");
      });
      return "  " + line.join(" ");
    })
    .join("\n");
}

// Format an array of (preferably short) strings in columns for console logging.
export function formatStringsAsGrid(arr) {
  // TODO: variable column width
  var longest = arr.reduce((len, str) => Math.max(len, str.length), 0),
    colWidth = longest + 2,
    perLine = Math.floor(80 / colWidth) || 1;
  return arr.reduce((memo, name, i) => {
    var col = i % perLine;
    if (i > 0 && col === 0) memo += "\n";
    if (col < perLine - 1) {
      // right-pad all but rightmost column
      name = utils.rpad(name, colWidth - 2, " ");
    }
    return memo + "  " + name;
  }, "");
}

// expose so GUI can use it
function formatLogArgs(args) {
  return utils.toArray(args).join(" ");
}

function messageArgs(args) {
  var arr = utils.toArray(args);
  var cmd = getStateVar("current_command");
  if (cmd && cmd != "help") {
    arr.unshift("[" + cmd + "]");
  }
  return arr;
}

function logArgs(args) {
  if (!LOGGING || getStateVar("QUIET") || !utils.isArrayLike(args)) return;
  var msg = formatLogArgs(args);
  if (STDOUT) console.log(msg);
  else console.error(msg);
}
