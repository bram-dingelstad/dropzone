//frontend.js
var database = require('./database');
var utils = require('./utils');
var config = require('./settings');
var web = require('./web');
var http = require('http');
var $ = require('jquery');
var gui = global.gui;
var last_list = [];
var currentView = 'dropzone';

//Frontend listeners for dropping files
$('.container, .dropzone, html, body, *').on('dragover', function (event) {
  prevent_default(event);
  switch_view('dropzone');
});

$('.container, .dropzone, html, body, *').on('dragenter', function (event) {
  prevent_default(event);
  switch_view('dropzone');
});

$('.container .dropzone').on('drop',
  function(event) {
    prevent_default(event);

    if (event.originalEvent.dataTransfer){
      var files = event.originalEvent.dataTransfer.files;

      for (var i = 0; i < files.length; i++) {
        database.add(files[i]);
      }

      if (files.length == 1) feedback('Dropped ' + files[0].name.substr(0, 15) + (files[0].name.length >= 15 ? '...' : '.'));
      else feedback('Dropped multiple files.');
    }
  }
);

//Listeners for button presses in the sidemenu
$('.sidebar ul li').click(switch_view);

//Listener for clicking the save_settings button
$('#save_settings').click(save_settings);

//Remove notice
$('#notice').toggle();

function prevent_default(event) {
  event.preventDefault();
  event.stopPropagation();
}

function switch_view(event) {
  if (typeof event == 'object') event = event.currentTarget.className;
  if (currentView != event) {
    $('.container > div').fadeOut(250, function () {
      setTimeout(function () {$('.container .' + event).fadeIn(250) }, 250);
    });

    if (event == 'list') build_list();
    else if (event == 'connection') check_availablity();
    else if (event == 'settings') get_settings();
    else if (event == 'open') open('http://' + config.get().host + ':' + config.get().port);
    // else

    currentView = event;
  }
}

function build_list() {
  console.log('Building list');
  $('div.list > ul').html('');

  database.list(function (list) {
    last_list = list;
    if (list.length == 0) $('div.list > ul').append('<li>No files were dropped yet');
    else $('div.list > ul').append(
      '<li id="commands"><div>' +
      '<i class="material-icons share">share</i>' +
      '<i class="material-icons remove">remove_circle</i>' +
      '<i class="material-icons web">open_in_browser</i>' +
      '</div></li>'
    )

    for (var i = 0; i < list.length; i++) {
        $('div.list > ul').append(
          '<li>' +
          '<span>' + list[i].name.substr(0, 45) + (list[i].name.length >= 45 ? '...' : '') + '</span>' +
          '<ul class="meta">' +
            '<li>' + (list[i].type || 'folder') + '</li>' +
            '<li>' + utils.parse_size(list[i].size) + '</li>' +
          '</ul>' +
          '<div>' +
            '<i class="material-icons open">open_in_new</i>' +
            '<i class="material-icons share">share</i>' +
            '<i class="material-icons folder">folder</i>' +
            '<i class="material-icons remove">remove_circle</i>' +
            '<i class="material-icons web">open_in_browser</i>' +
          '<div>' +
          '</li>'
        );
    }

    $('div.list > ul > li').click(function () {
      if (!$(this).attr('id')) $(this).toggleClass('clicked');
    });

    $('div.list > ul > li > div > i').click(function () {
      var index = $($(this).parents()[1]).index() - 1;

      //If it's not the main command pallete in the list view.
      if (!$($(this).parents()[1]).attr('id')) {
        if ($(this).text() == 'open_in_new') open(last_list[index].path);
        else if ($(this).text() == 'share') {
          clipboard('http://' + config.get().host + ':' + config.get().port + '/preview/' + last_list[index].name);
          feedback('Copied the link to your clipboard :D');
        }
        else if ($(this).text() == 'folder') open(last_list[index].path.split(/\\|\//g).splice(0, last_list[index].path.split(/\\|\//g).length - 1).join('\/'));
        else if ($(this).text() == 'remove_circle') {
          $($(this).parents()[1]).addClass('removed');
        	database.rem(last_list[index]._id);
          setTimeout(build_list, 500);
          feedback('Undropped ' + last_list[index].name.substr(0, 15) + (last_list[index].name.length >= 15 ? '...' : '.'));
        }
        else if ($(this).text() == 'open_in_browser') open('http://' + config.get().host + ':' + config.get().port + '/preview/' + last_list[index].name);
      }
      //When it is
      else {
        if ($(this).text() == 'share') {
          clipboard('http://' + config.get().host + ':' + config.get().port);
          feedback('Copied Dropzone location to clipboard!');
        }
        else if ($(this).text() == 'remove_circle') {
          $('div.list > ul > li').addClass('removed');
        	database.rem(last_list);
          setTimeout(build_list, 500);
          feedback('Undropped all files');
        }
        else if ($(this).text() == 'open_in_browser') open('http://' + config.get().host + ':' + config.get().port);
      }

    });
  });
}

function check_availablity() {
  http.get('http://' + config.get().host + ':' + config.get().port, function (res) {
    var _data = '';

    res.on('data', function (data) {
      _data += data;
    });

    res.on('end', function () {
      if ((_data.match('<meta content="dropzone"/>') || []).length > 0) {
        $('.topbar i').text('cloud_done');
        $('.connection > div').attr('class', 'available');
        setTimeout(function () {$('.topbar i').text('cloud');}, 3000);
        $('.connection > div > i').text('done');
        $('.connection > span').text('Your dropzone is currently available.');
      }
      else {
        $('.topbar i').text('cloud_off');
        $('.connection > div').attr('class', 'notavailable');
        setTimeout(function () {$('.topbar i').text('cloud');}, 3000);
        $('.connection > div > i').text('clear')
        $('.connection > span').text('Your dropzone is currently not available via the set address.');
      }
    });
  });
}

function get_settings() {
  $('input#host').val(config.get().host);
  $('input#use_custom_host').prop('checked', config.get().use_custom_host);
  $('input#port').val(config.get().port);
}

function save_settings() {
  config.set('host', $('input#host').val() || 'localhost');
  config.set('use_custom_host', $('input#use_custom_host').prop('checked'));
  config.set('port', parseInt($('input#port').val()) || 9648);

  web.restart(function () {
    feedback('Saved your settings and restarted the server');
  });
}

function open(location) {
  gui.Shell.openExternal(location);
}

function clipboard(str) {
  gui.Clipboard.get().set(str, 'text');
}

function feedback(str) {
  $('#feedback span').text(str);
  $('#feedback').addClass('show');
  setTimeout(function () {
    $('#feedback').removeClass('show');
  }, 1500);
}

module.exports = {'feedback': feedback};
