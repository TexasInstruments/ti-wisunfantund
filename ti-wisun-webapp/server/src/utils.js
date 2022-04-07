/**
 * This function returns the date from a format specification
 * @param {Format} date
 * @returns {date string}
 */
function timestamp(date) {
  let dateToFormat = date ? date : new Date();
  return (
    dateToFormat.toLocaleString('en-US', {
      timeZone: 'America/Chicago',
    }) +
    ' ' +
    dateToFormat.getUTCMilliseconds() +
    'ms'
  );
}

/**
 * This function sets up timeout intervals for executing
 * the `func` `n` times. It also returns a function to cancel
 * the timeouts (used mostly for aborting pingbursts).
 * @param {function} func
 * @param {function} interval
 * @param {integer} n
 * @param  {...any} args
 * @returns {function for aborting}
 */
function repeatNTimes(func, interval, n, ...args) {
  const timerIds = [];
  for (let i = 0; i < n; i++) {
    const timerId = setTimeout(func, interval * i, ...args);
    timerIds.push(timerId);
  }
  //abort function
  return () => {
    for (let id of timerIds) {
      clearTimeout(id);
    }
    return true;
  };
}

/**
 * Get the JS Object key for a specified value
 */
function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key] === value);
}

/**
 * This function sets up an interval for executing
 * the `func` infinite times. It also returns a function to cancel
 * the interval (used mostly for aborting pingbursts).
 * @param {*} func
 * @param {*} interval
 * @param  {...any} args
 * @returns
 */
function intervalWithAbort(func, interval, ...args) {
  const intervalID = setInterval(func, interval, ...args);
  return () => {
    clearInterval(intervalID);
    return true;
  };
}

module.exports = {timestamp, repeatNTimes, getKeyByValue, intervalWithAbort};
