var FormView = require('ampersand-form-view');
var InputView = require('ampersand-input-view');

InputView = InputView.extend({
    derived: {
        validityClass: {
            deps: ['valid', 'validClass', 'invalidClass', 'shouldValidate'],
            fn: function () {
                if (!this.shouldValidate) {
                    return '';
                } else {
                    return this.valid ? this.validClass : this.invalidClass;
                }
            }
        }
    }
});
// modify InputView to behave as we want it to
InputView.prototype.handleBlur = function() { console.log('blur stub'); };
InputView.prototype.reset = function() {
    this.setValue('');
    this.shouldValidate = false;
}

module.exports = FormView.extend({
    fields: function () {
        this.message_input = new InputView({
            name: 'message',
            placeholder: 'Message',
            requiredMessage: 'Please enter a message.',
            parent: this
        });
        return [
            this.message_input,
            new InputView({
                name: 'sender',
                value: this.model && this.model.username,
                type: 'hidden',
                parent: this
            })
        ];
    },
    resetMessage: function() {
        this.message_input.reset();
    }
});
