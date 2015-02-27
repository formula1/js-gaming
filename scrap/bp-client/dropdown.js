/* z-index counter. so that the last dropdown will be on top */
var z_counter = 999;

<!-- Hide/Show Lobby functionality -->
var $lobby = $('#lobby')
  , $lobby_trigger = $('#lobby_trigger');
$(function() {
  $lobby.hide();
  var columns_resized = false;

  $('#lobbyWrapperDiv').hoverIntent(function() {
    console.log('hover trigger fired!');
    if ($lobby_trigger.hasClass('active')) {
      return;
    }
    else {
      $lobby
        .css({
          left: calculateLeft($lobby_trigger, $lobby)
        , top: calculateTop($lobby_trigger)
        ,'z-index': z_counter
        })
        .stop(true, true)
        .show('fade', 250);
        z_counter++;
      if (! columns_resized) {
        $lobby.find('#table_list').dataTable().fnAdjustColumnSizing();
        columns_resized = true;
      }
    }
  }, function() {
    console.log('hover off trigger fired!');
    if ($lobby_trigger.hasClass('active')) {
      return;
    }
    else {
      $lobby.stop(true, true)
            .hide();
    }

  });

  $lobby_trigger.click(function() {
    console.log('lobby trigger fired!');
    if (! $lobby_trigger.hasClass('active')) {

      // add active class
      $lobby_trigger
        .addClass('active');
      // show lobby form
      $lobby
        .css({
          left: calculateLeft($lobby_trigger, $lobby)
        , top: calculateTop($lobby_trigger)
        ,'z-index': z_counter
        })
        .stop(true, true)
        .show('fade', 400);
        z_counter++;
      if (! columns_resized) {
        $lobby.find('#table_list').dataTable().fnAdjustColumnSizing();
        columns_resized = true;
      }
    }
    else {
      // remove active class
      $lobby_trigger
        .removeClass('active');
      // hide lobby form
      $lobby
        .stop(true, true)
        .hide();
    }
  });


  if ($('#server_values').data('current_table_names') && $('#server_values').data('current_table_names').length === 0) {
    $lobby_trigger.click();
  }

});

/*This is not working yet */
/*
$(function() {
  var $lobby_trigger = $('#lobby_trigger')
    , $lobby_dropdown = $('#lobby');
  $lobby_trigger.click(function() {
    toggleDropdown($lobby_trigger, $lobby_dropdown,
                   { top: 0
                   , toggle_args: ['slide', { direction: 'right' }, 400] });
  });
});
*/

$(function() {
  var $account_trigger = $('#account_trigger')
    , $account_dropdown = $('#account');
  $account_trigger.click(function() {
    toggleDropdown($account_trigger, $account_dropdown,
                   { top: top
                   , toggle_args: ['slide', { direction: 'right' }, 400] });
  });
});

$(function() {
  var $faq_trigger = $('#faq_trigger')
    , $faq_dropdown = $('#faq_dropdown');
  $faq_trigger.click(function() {
    toggleDropdown($faq_trigger, $faq_dropdown,
                   { top: top
                   , left: 0 
                   , toggle_args: ['slide', { direction: 'left' }, 400] });
  });
});

$(function() {
  var $lottery_trigger = $('#lottery_trigger')
    , $lottery_dropdown = $('#lottery_dropdown');
  $lottery_trigger.click(function() {
    toggleDropdown($lottery_trigger, $lottery_dropdown,
                   { top: top 
                   , toggle_args: ['slide', { direction: 'up' }, 400] });
  });
});


/*Show funbucks/bitcoin balances on Hover 
$(function() {
  $('#account_trigger').hoverIntent(accountHoverOn, accountHoverOff)

});

function accountHoverOn() {
  $('#chip_count').show();
}

function accountHoverOff() {
  $('#chip_count').hide();
} */

$(function() {
  var $login_trigger = $('#login_trigger')
    , $login_dropdown = $('#login');
  $login_trigger.click(function() {
    toggleDropdown($login_trigger, $login_dropdown,
                   { toggle_args: ['slide', { direction: 'up' },
                     function() {
                       if ($register_trigger.hasClass('active')) {
                         toggleDropdown($register_trigger, $register_dropdown,
                                        { toggle_args: ['slide', { direction: 'up' } ] });
                       }
                     }]
                   });
    $login_dropdown.find('#login_username').focus();
  });

  var $register_trigger = $('#register_trigger')
    , $register_dropdown = $('#register');
  $register_trigger.click(function() {
    toggleDropdown($register_trigger, $register_dropdown,
                   { toggle_args: ['slide', { direction: 'up' },
                     function() {
                       if ($login_trigger.hasClass('active')) {
                         toggleDropdown($login_trigger, $login_dropdown,
                                        { toggle_args: ['slide', { direction: 'up' } ] });
                       }
                     }]
                   });
    $register_dropdown.find('#register_username').focus();
  });
});


$(function() {
  var $report_bug_trigger = $('#report_bug_trigger')
    , $report_bug_dropdown = $('#report_bug');
  $report_bug_trigger.click(function() {
    toggleDropdown($report_bug_trigger, $report_bug_dropdown,
                   {toggle_args: ['slide', { direction: 'up' }] });
    $report_bug_dropdown.find('textarea').focus();
  });

  // report_bug ajax form submission
  $('#report_bug').find('form').submit(function(e) {
    console.log($(this).attr('id'));
    var empty_form = $(this).html(); //$(this) is $report_bug
    // form has been submitted; $(this) is the form
    e.preventDefault();
    console.log('report_bug form submitted!');
    // add spinner image (replaces submit button?)
    $('#bug_submit').hide();
    $('#loader').show();

    var $message = $(this).find('textarea')
      , message = $message.val();
    $.post('/report_bug', {
      message: message
    }, function(response) {
      console.log('response from server:', response);
      // hide spinner image
      $('#loader').hide();

      // show "received" message
      $('#feedback_message').show();
      
      // hide report_bug form after delay
      var delay = 3
        , $explode_timer = $('#explode_timer')
        , second_seconds = 'seconds';
      $explode_timer.text(delay + ' ' + second_seconds);
      setInterval(function() {
        delay--;
        if (delay === 0) {
          $('#report_bug').effect('explode', { pieces: 16 }, 500, function() {
            $(this).find('form').html(empty_form);
          });
        }
        else {
          second_seconds = delay > 1 ? 'seconds' : 'second';
          $explode_timer.text(delay + ' ' + second_seconds);
        }
      }, 1000);
            $('#report_bug_trigger').removeClass('active');
    });
  });
});

function toggleDropdown($trigger, $dropdown, options) {
  console.log('toggleDropdown called with', $trigger, $dropdown);
  //console.log('$dropdown\'s top and left are', $dropdown.position().top, $dropdown.position().left);
  
  // calculate and set position of $dropdown
  var left = (! _.isUndefined(options.left)) ? options.left : calculateLeft($trigger, $dropdown)
    , top = (! _.isUndefined(options.top)) ? options.top : calculateTop($trigger)
    , toggle_args = options.toggle_args || ['fade']
  $dropdown.css({
    left: left
  , top: top
  });

  // add or remove active class
  $trigger.toggleClass('active');
  z_counter++;

  // set z-index for dropdowns being shown only - not those being hidden
  if ($trigger.hasClass('active')) {
    $dropdown.css('z-index', z_counter);
  }

  // show or hide dropdown
  $dropdown.stop(true, true)
           .toggle.apply($dropdown, toggle_args);
}

function calculateLeft($trigger, $dropdown) {
  // calculate trigger's left and maximum left
  var trigger_left = $trigger.offset().left
    , max_left = $(window).width() - $dropdown.outerWidth(true)
  // return whichever is less
    , left = trigger_left < max_left ? trigger_left : max_left;
  return left;
}

function calculateTop($trigger) {
  // return vertical position of $trigger's bottom
  console.log($trigger.position().top, $trigger.outerHeight(true));
  return $trigger.offset().top + $trigger.outerHeight(true);
}

<!-- Hide/Show Register functionality -->
$.validator.setDefaults({
  messages: {
    new_password_confirm: {
      equalTo: 'Password fields must match.'
    }
  }
});
$(function() {
  $('#register form[action="/register"]').validate();
  $('#login form[action="/login"]').validate();
});

// workaround - only run this code if socket exists
if (typeof socket !== 'undefined') {
  socket.on('new_balance', function(currency, balance) {
    $('#' + currency + '_balance').text(balance);
    $('#' + currency + '_counter').text(balance);
  });
}