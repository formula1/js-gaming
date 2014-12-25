var _ = require('lodash');
var AmpersandModel = require('ampersand-model');

module.exports = AmpersandModel.extend({
    type: 'user',
    props: {
        id: ['string'],
        firstName: ['string'],
        lastName: ['string'],
        username: ['string', true],
    },
    derived: {
        fullName: {
            deps: ['firstName', 'lastName'],
            cache: true,
            fn: function () {
                var fullName;
                if (_.isEmpty(this.firstName) && _.isEmpty(this.lastName)) {
                    fullName = 'Stranger';
                }
                else if (_.isEmpty(this.firstName)) {
                    fullName = 'Mr. or Ms. ' + this.lastName;
                }
                else {
                    fullName = this.firstName;
                }
                return fullName;
            }
        }
    }
});
