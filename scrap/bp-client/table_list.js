(function($) {
  // helper functions for fake-fraction sorting
  function getNumBeforeSlash(str) {
    var slash_index = str.indexOf('/')
      , before_slash = str.substring(0, slash_index);
    before_slash = parseInt(before_slash);
    return before_slash;
  }
  
  //launch table game function.
  function launchTableGame() {
    var table_name = $(this).attr('id')
      , username = $('#user_server_values').data('username');
    if (username !== null &&
        window.document.title =='Bitcoin Poker') {
      console.log('logged in as', username, 'and on landing page. Launching iframe: ', table_name );
      iframes.openNewIframe(table_name);

      //redirect to table
      //window.location.href = '/' + table_name;

      //open new window at table
      //return popup(table_name);

      //remove 'active' class from lobby_trigger and hide lobby
      $('#lobby_trigger').click();        
    }
    else {
      //navigate to home page
      console.log('redirected to landing page');
      window.location.href = "/login?next=/?joined_table_name=" + table_name;
    }
    //}
  }

  jQuery.fn.dataTableExt.oSort['fake-fraction-asc']  = function(a, b) {
    var first_num = getNumBeforeSlash(a)
      , second_num = getNumBeforeSlash(b);
    return ((first_num < second_num) ? -1 :
           ((first_num > second_num) ?  1 : 0));
  };
  jQuery.fn.dataTableExt.oSort['fake-fraction-desc'] = function(a,b) {
    var first_num = getNumBeforeSlash(a)
      , second_num = getNumBeforeSlash(b);
    return ((first_num < second_num) ?  1 :
           ((first_num > second_num) ? -1 : 0));
  };

  // helper function for renderBlinds
  function addCommasToNumber(num) {
    var thousands = Math.floor(num / 1000)
      , ones = (num % 1000).toString();
    if (thousands === 0) {
      return ones;
    }
    else {
      while (ones.length < 3) {
        ones = '0' + ones;
      }
      return addCommasToNumber(thousands) + ',' + ones;
    }
  }

  function renderBlinds(blinds_string, type, row_data) {
    if (type === 'display') {
      var blinds = blinds_string.split('/') // [SB, BB]
        , small_blind = blinds[0]
        , big_blind = blinds[1]
        , currency = row_data[2];
      if (currency === 'satoshi' && small_blind >= 1000000) {
        small_blind /= 1e8;
        big_blind /= 1e8;
        return small_blind + ' / ' + big_blind + ' BTC';
      }
      else {
        return addCommasToNumber(small_blind) + ' / ' + addCommasToNumber(big_blind) + ' ' + currency;
      }
    }
    else {
      return blinds_string;
    }
  }

  var $table_list = $('#table_list').dataTable({
      bJQueryUI: true,
      sDom: 't',
      bPaginate: false,
      iDisplayLength: 18,
      sScrollY: '475px',
      aaSorting: [[3,'desc'], [1, 'asc']],
      aoColumns: [
          null,
          { mRender: renderBlinds, bUseRendered: false, sType: 'fake-fraction' },
          { bVisible: false },
          { sType: 'fake-fraction' }
      ]
  });
  $table_list.fnFilter('funbucks', 2);

  // Add a bootstrap-switch button that toggles currency filter
  $('#currency-switch').bootstrapSwitch()
                       .on('switch-change', function (e, data) {
    // filter by second column (Currency), depending on switch value
    $table_list.fnFilter( data.value ? 'funbucks' : 'satoshi', 2 );
  });

  // Add a click handler for the table rows
  $('#table_list tbody').on('click', 'tr', launchTableGame);

  // Adjust column sizes when window resizes
  $(window).bind('resize', function() {
    $table_list.fnAdjustColumnSizing();
  });


  // workaround - only run this code if socket exists
  if (typeof socket !== 'undefined') {
    socket.on('new_num_players', function(table_name, num_players) {
      console.log('Socket.on...new_num_players. Time to update the lobby count.', table_name, num_players );
      $('#' + table_name + ' .num_players').text(num_players);
    });
  }
})(jQuery);