function loadOptions(app) {
  chrome.runtime.sendMessage({ command: 'options:get' }, function(options) {
    var elem = document.getElementById('app');
    app.channels = options.channels;

    if (options.source && options.source.username) {
      app.username = options.source.username;
      app.sync = 'automatic';
      app.page = 'channels';
    } else if (options.source) {
      app.sync = 'manual';
      app.page = 'channels';
    }

    rivets.bind(elem, { app: app });
  });
}

function saveOptions(app) {
  var message = {
    command: 'options:set',
    options: {
      channels: app.channels,
      source: { username: app.username }
    }
  };

  chrome.runtime.sendMessage(message, function(result) {
    window.close();
  });
}

function fetchFollows(username, next) {
  var url = 'https://api.twitch.tv/kraken/users/' + encodeURIComponent(username) + '/follows/channels';

  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.setRequestHeader('Client-ID', 'Twitch Stream Notifier (https://github.com/schmich/twitch-stream-notifier)');
  xhr.setRequestHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
  xhr.onreadystatechange = function() {
    if (xhr.readyState === 4) {
      var response = JSON.parse(xhr.responseText);
      next(response.follows);
    }
  };

  xhr.send();
}

function nextPage(app) {
  if (app.page === 'sync') {
    if (app.sync === 'automatic') {
      app.page = 'account';
    } else {
      app.page = 'channels';
    }
  } else {
    app.page = 'channels';
  }
}

function prevPage(app) {
  if (app.page === 'account') {
    app.page = 'sync';
  } else if (app.page === 'channels') {
    if (app.sync === 'automatic') {
      app.page = 'account';
    } else {
      app.page = 'sync';
    }
  }
}

document.addEventListener('DOMContentLoaded', function() {
  var app = {
    sync: null,
    page: 'sync',
    tab: 'channels',
    username: null,
    channels: null,
    submitUsername: function() {
      nextPage(app);
      fetchFollows(app.username, function(follows) {
        app.channels = [];
        for (var i = 0; i < follows.length; ++i) {
          app.channels.push(follows[i].channel.name);
        }
      });
    }
  };

  var save = document.getElementById('save');
  save.onclick = function() { saveOptions(app); };

  var tabs = document.getElementsByClassName('tab');
  for (var i = 0; i < tabs.length; ++i) {
    tabs[i].onclick = function() {
      app.tab = this.dataset.tab;
    };
  }

  rivets.formatters.eq = function(value, other) {
    return value == other;
  };

  rivets.formatters.length = function(arr) {
    return arr.length;
  };

  var next = document.querySelectorAll('[data-nav="next"]');
  for (var i = 0; i < next.length; ++i) {
    next[i].addEventListener('click', function() { nextPage(app); });
  }

  var prev = document.querySelectorAll('[data-nav="prev"]');
  for (var i = 0; i < prev.length; ++i) {
    prev[i].addEventListener('click', function() { prevPage(app); });
  }

  loadOptions(app);
});
