var _ = require('lodash');

var messages = [];
var id = 0;

function get(id) {
    return _.findWhere(messages, {id: parseInt(id + '', 10)});
}

exports.list = function (req, res) {
    res.send(messages);
};

exports.add = function (req, res) {
    var message = req.body;
    message.id = id++;
    messages.push(message);
    res.status(201).send(message);
};

exports.get = function (req, res) {
    var found = get(req.params.id);
    res.status(found ? 200 : 404);
    res.send(found);
};

exports.delete = function (req, res) {
    var found = get(req.params.id);
    if (found) messages = _.without(messages, found);
    res.status(found ? 200 : 404);
    res.send(found);
};

exports.update = function (req, res) {
    var found = get(req.params.id);
    if (found) _.extend(found, req.body);
    res.status(found ? 200 : 404);
    res.send(found);
};
