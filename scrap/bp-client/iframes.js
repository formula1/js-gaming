(function() {
  function resizeIFrame(table_name, height, width, options) {
    if(! _.isObject(options)) { var options = {}; }
    var iframe = $('[src="/'+ table_name + '"]');
  //iframe.css('float','right')
  //if(options.right) { var oldWidth = iframe.width(); }
  //if(options.bottom) { var oldHeight = iframe.height(); }

    iframe.height(height).width(width);
  }

  function resizeWindowJazz(e) {
    var height = $(window).height()
      , width = $(window).width()
      , scale_ratio = _.min([width / 690, height / 465, 1])
      , scale_string = 'scale(' + scale_ratio + ', ' + scale_ratio + ')'
      , distance_to_shift = (1 - scale_ratio) / 2
      , translate_ratio = distance_to_shift / scale_ratio * 100
      , translate_string = 'translate(-'+ translate_ratio + '%, -' + translate_ratio + '%)'
      , transform_string = scale_string + ' ' + translate_string;
    console.log('Window resized with dimensions', height, ',', width);
    $('.iframe').css('transform', transform_string);
  }

  var throttled = _.throttle(resizeWindowJazz, 2000);

  // resize once every 2 seconds when window is resized
  $(window).resize(throttled);

  // resize once upon page load
  $(resizeWindowJazz);

  var id_prefix = 'iframe_'
    , iframe_template =
  '<div id="iframe_<%= table_name %>" class="iframe unselectable">' +
    '<div class="iframe_header unselectable">' +
      '<span class="iframe_header_title"></span>' +
      '<a href="#" class="iframe_refresh pull-left">' +
        '<span class="glyphicon glyphicon-refresh"></span>' +
      '</a>' +
      '<a href="#" class="iframe_close pull-right">' +
        '<span class="glyphicon glyphicon-remove"></span>' +
      '</a>' +
    '</div>' +
    '<iframe src="/<%= table_name %>" width="665" height="450">' +
        '<p>Your browser does not support iframes.</p>' +
        '<p><a href="http://www.smashingmagazine.com/2012/07/10/dear-web-user-please-upgrade-your-browser/">Upgrade your browser</a></p>' +
        '<p>Or go directly to <a table_name="/<%= table_name %>">/<%= table_name %></a>.</p>' +
    '</iframe>' +
  '</div>'
    , $iframe_container = $('#iframe_container')
    , $html_body = $('html,body') // elements to be scrolled
    , initial_tables = $('#server_values').data('current_table_names');

  function openNewIframe(table_name) {
    var $iframe = findIframe(table_name);
    if ($iframe.length > 0) {
        console.log('iframe already open for table_name', table_name);
        $html_body.animate({ scrollTop: $iframe.offset().top }, 500);
        return;
    }
    var $iframe = $(_.template(iframe_template, {
        table_name: table_name
    }));

    //DETERMINE WHERE THE IFRAME WILL GO
    assignIFramePosition($iframe)

    //stylePage()//style page if needed

    $iframe_container.append($iframe);
    // make iframe draggable
    $iframe.draggable({
      handle: '.iframe_header'
    , snap: true
    , snapMode: 'outer'
    , containment: '#iframe_container'
    , iframeFix: true
    //, stack: '.iframe'
    });

    $iframe.find('.iframe_refresh').click(function(){
      console.log('iframe refresh', this);
      $iframe.find('iframe').get(0).contentWindow.location.reload();
    });

    //wyv addition: set x to close before poker table loads
    setIframeCloseHandler(table_name, function(){closeIframe(table_name)})

    // iframe classes are from main.css
    function assignIFramePosition(iframe) {
      var getPositionClassFromPositionNumber = function(table_position_number) { return 'table_'+table_position_number; };
      var checkIfTablePositionExists = function(table_position_number) {
        var positionClass = getPositionClassFromPositionNumber(table_position_number);
        if ($iframe_container.find('.'+positionClass).length > 0) { return true; }
        else { return false; }
      };

      var classAssigned = false;
      var position_number = 0;
      while (classAssigned !== true) {
        if (! checkIfTablePositionExists(position_number) || position_number > 18) {
          iframe.addClass(getPositionClassFromPositionNumber(position_number));
          classAssigned = true;
        }
        position_number++;
      } // loop
    } // assign iframe position

    //add autohide class to navbar is landscape phone
    toggleNavbarAutoHideOnLandscapePhone(true);

  } // openNewIframe

  // open iframes for each table_name in initial_tables
  _.each(initial_tables, function(table_name) {
    openNewIframe(table_name);
  });

  function setIframeCloseHandler(table_name, close_handler) {
 //   console.log('setIframeCloseHandler called with', table_name, close_handler);
    var $iframe = findIframe(table_name);
    $iframe.find('.iframe_close').off('click.IframeCloseHandler').on('click.IframeCloseHandler', function(e){
      //console.log('iframe_close trigger');
      close_handler();
    })
  }

  function setIframeTitle(table_name, title) {
    //console.log('setIframeTitle called with', table_name, title)
    var $iframe = findIframe(table_name);
    if ($iframe.length > 0) {$iframe.find('.iframe_header_title').text(title);}
    else {console.error('no iframe found for table_name', table_name); }
  }

  function closeIframe(table_name) {
    var $iframe = findIframe(table_name);
    if ($iframe.length > 0) {
      $iframe.remove();
    }
    else {
      console.error('no iframe found for table_name', table_name);
    }
    if ($('#iframe_container').find('iframe').length === 0) {
      $('#lobby_trigger').click();
    }
    $.post('/leave_table', { table_name: table_name }, function(response) {
      console.log('/leave_table returns', response)
    })

//if last iframe we want to show the navbar
var allIFrames = getAllIFrames()
if(allIFrames.length < 1){toggleNavbarAutoHideOnLandscapePhone(false)}
  else if(allIFrames.length >= 1){toggleNavbarAutoHideOnLandscapePhone(true)}

  }
  
function toggleNavbarAutoHideOnLandscapePhone (trueOrFalse){

if(trueOrFalse === true){$('#navbar').addClass('hidden-landscape-phone')}
  else if(trueOrFalse === false){$('#navbar').removeClass('hidden-landscape-phone')}

}

  function findIframe(table_name) {
    var iframe_id = id_prefix + table_name
      , $iframe = $iframe_container.find('#' + iframe_id);
    return $iframe;
  }

  var Top = 1;

  function setIFrameToTop(table_name) {
    var blah = findIframe(table_name);
    var new_top = Top + 1;
    blah.css("z-index", new_top);
    Top++;
    //console.log("setIFrametoTop SAYS: new top is ", Top);
  }

function getAllIFrames (){
  return $('.iframe')
}

  function setIFrameHeaderToTop() {
    this.style.zIndex= Top + 1;
    Top++;
    //console.log("setiframeHeaderToTop SAYS: new top is ", Top);
   }
 
 $('#iframe_container').on("mousedown", ".iframe", setIFrameHeaderToTop);

  iframes = {
    openNewIframe: openNewIframe
  , setIframeCloseHandler: setIframeCloseHandler
  , setIframeTitle: setIframeTitle
  , closeIframe: closeIframe
  , setIFrameToTop: setIFrameToTop
  , resizeIFrame: resizeIFrame
  };
})();

