function load() {
  rivets.formatters.number = function(value) {
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  rivets.formatters.length = function(arr) {
    return arr.length;
  };

  rivets.formatters.elapsed = function(date) {
    var elapsed = [];

    var deltaMs = Date.now() - (new Date(date));

    var deltaHr = Math.floor(deltaMs / (1000 * 60 * 60));
    if (deltaHr > 0) {
      deltaMs -= deltaHr * (1000 * 60 * 60);
      elapsed.push(deltaHr + 'h');
    }

    var deltaMin = Math.floor(deltaMs / (1000 * 60));
    if (deltaMin > 0) {
      elapsed.push(deltaMin + 'm');
    }

    if (elapsed.length === 0) {
      return 'Just now';
    }

    return elapsed.join(' ');
  };

  chrome.runtime.sendMessage({ command: 'streams:list' }, function(result) {
    console.log(result);
    var app = result;
    app.addChannels = function() {
      chrome.runtime.sendMessage({ command: 'options:show' }, function() { });
    };

    rivets.bind(document.getElementById('app'), { app: app });
    
    var streamElems = document.getElementsByClassName('stream');
    for (var i = 0; i < streamElems.length; ++i) {
      addClickListener(streamElems[i]);
    }
  });

  var options = document.getElementById('options');
  options.addEventListener('click', function() {
    chrome.runtime.sendMessage({ command: 'options:show' }, function() { });
  });
}

function addClickListener(elem) {
  elem.addEventListener('click', function() {
    var channel = elem.getAttribute('channel');
    chrome.tabs.create({ url: 'http://www.twitch.tv/' + encodeURIComponent(channel) });
  });
}

document.addEventListener('DOMContentLoaded', load);
