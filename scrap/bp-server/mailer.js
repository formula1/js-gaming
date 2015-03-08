module.exports = (function () {
  var nodemailer = require('nodemailer')
    , db_config = require('./models/db.config');

  //create reusable transport method (opens pool of SMTP connections)
  var smtp_transport = nodemailer.createTransport('SMTP', {
    service: 'Gmail'
  , auth: {
      user: db_config.EMAIL_ADDRESS
    , pass: db_config.EMAIL_PASSWORD
    }
  });

  // send confirmation email with a link to the confirmation route
  var sendConfirmationEmail = function(email_address, confirmation_code, username) {
    var confirmation_url = 'https://bitpoker.io/verify_email?email=' + email_address +
                           '&confirmation_code=' + confirmation_code
      , greeting = 'Hi ' + username + '!'
      , confirmation_email = {
          from: 'Bitpoker <' + db_config.EMAIL_ADDRESS + '>' //sender address
        , to: email_address //list of receivers
        , subject: 'Bitpoker E-mail Confirmation' // subject line
        , text: greeting + '\nClick here to confirm your email address for bitpoker:\n' + confirmation_url
        , html: '<b>' + greeting + '</b><br />' +
                'Click <a href="' + confirmation_url +
                '">here</a> to confirm ' + email_address + ' as your bitpoker account\'s email address.'
    };
    smtp_transport.sendMail(confirmation_email, function(error, response){
      if (error) {
        console.log(error);
      }
      else {
        console.log('Message sent: ' + response.message);
      }
      // if you don't want to use this transport object anymore, uncomment following line
      smtp_transport.close(); // shut down the connection pool, no more messages
    });
  };

  // send password recovery email with a link to the password reset route.
  var sendPasswordRecovery = function(email_address, recovery_code, username) {
    var recovery_url = 'https://bitpoker.io/password_reset?email=' + email_address +
                        '&recovery_code=' + recovery_code + '&username=' + username
        , greeting = 'Hello ' + username + ','
        , password_recovery_email = {
          from: 'Bitpoker <' + db_config.EMAIL_ADDRESS + '>' //sender address
        , to: email_address //list of receivers
        , subject: 'Bitpoker Password Recovery' // subject line
        , text: greeting + '\nClick here to reset your password:\n' + recovery_url
        , html: '<b>' + greeting + '</b><br />' +
                'Click the following link to reset your bitpoker account\'s password:<br />' +
                '<a href="' + recovery_url + '">' + recovery_url + '</a>'
    };
    smtp_transport.sendMail(password_recovery_email, function(error, response){
      if (error) {
        console.log(error);
      }else {
        console.log('Recovery message sent: ' + response.message);
      }
      smtp_transport.close();
    });
  };

  var sendBugReport = function(username, message, cb) {
    var bug_report_email = {
        from: 'Bitpoker <' + db_config.EMAIL_ADDRESS + '>'
      , to: 'x+4986429595084@mail.asana.com'
      , subject: 'Bug/Feedback by ' + username
      , text: message
      , html: message
    };
    console.log('Sending bug report email:', bug_report_email);
    smtp_transport.sendMail(bug_report_email, function(error, response){
      smtp_transport.close();
      if (error) {
        console.error('Error while sending bug report message:', error);
      }
      else {
        console.log('Feedback sent from', username , 'with message', message);
      }
      cb(error);
    });
  };

  return {
    sendConfirmationEmail: sendConfirmationEmail,
    sendPasswordRecovery: sendPasswordRecovery,
    sendBugReport: sendBugReport
  };
})();