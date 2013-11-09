var log4js = require('log4js');

global.logger = log4js.getLogger('bubbly');
global.logger.setLevel(process.env.BUBBLY_LOG_LEVEL || 'INFO');
