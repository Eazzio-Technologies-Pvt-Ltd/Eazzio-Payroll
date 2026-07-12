/**
 * Timezone utilities to handle standard India timezone GMT+5:30
 */

/**
 * Returns YYYY-MM-DD date string in IST timezone
 */
const getLocalDateString = (date = new Date()) => {
  const localTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  return localTime.toISOString().split('T')[0];
};

/**
 * Returns a Date object representing the start of the day in IST,
 * stored as a UTC date for database consistency (YYYY-MM-DDT00:00:00.000Z)
 */
const getLocalDate = (date = new Date()) => {
  const localStr = getLocalDateString(date);
  return new Date(`${localStr}T00:00:00.000Z`);
};

/**
 * Returns the local hour and minute in IST timezone
 */
const getLocalHoursAndMinutes = (date = new Date()) => {
  const localTime = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  return {
    hours: localTime.getUTCHours(),
    minutes: localTime.getUTCMinutes()
  };
};

module.exports = {
  getLocalDateString,
  getLocalDate,
  getLocalHoursAndMinutes
};
