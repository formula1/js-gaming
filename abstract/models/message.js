var Waterline = require('waterline');

module.exports = {
  identity: 'message',
  attributes: {
    sender: {
      type: 'string',
      required: true
    },
    message: {
      type: 'string',
      required: true
    },
    timestamp: {
      type: 'date',
      required: true
    },
  }
};