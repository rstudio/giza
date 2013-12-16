var log4js = require('log4js');

var logger = log4js.getLogger('bubbly');
logger.setLevel(process.env.GIZA_LOG_LEVEL || 'WARN');

module.exports = logger;
