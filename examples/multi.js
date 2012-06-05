var Logger = require('../lib/bunyan');
log = new Logger({
  name: 'amon',
  streams: [
    {
      level: 'info',
      stream: process.stdout,
    },
    {
      level: 'error',
      path: 'multi.log'
    }
  ]
});


log.debug('hi nobody on debug');
log.info('hi stdout on info');
log.error('hi both on error');
log.fatal('hi both on fatal');
