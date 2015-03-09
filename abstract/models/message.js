var Waterline = require('waterline');

module.exports = {
  identity: 'message',
  tableName: 'messages',
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
      type: 'string',
      required: true
    },
  }
};