var defaultOptions = {
  channels: [],
  source: null,
  version: 1
};

/*
var channels = [
  'trihex', 'kolento', 'forsenlol', 'puncayshun', 'sjow', 'destiny', 'eloise_ailv',
  'legendarylea', 'mira_hs', 'fenn3r', 'crank', 'kaitlyn', 'vibelol', 'protech', 'nl_kripp',
  'lirik', 'sodapoppin', 'summit1g', 'phantoml0rd', 'nightblue3', 'goldglove', 'trick2g',
  'swiftor', 'pewdiepie', 'trumpsc', 'amazhs', 'yogscast', 'gassymexican', 'sivhd', 'froggen',
  'aphromoo', 'cohhcarnage', 'dansgaming', 'meteos', 'ellohime', 'real_jansoon', 'reynad27', 
  'riotgames', 'tsm_dyrus', 'smitegame', 'voyboy', 'chaoxlol', 'reckful', 'starcraft', 'kungentv',
  'wingsofdeath', 'patopapao', 'cabochardlol', 'narkuss_lol', 'ogaminglol', 'bibaboy', 'joshog',
  'inetkoxtv', 'esl_csgo', 'resttpowered', 's1mpleof', 'kaceytron', 'strifecro', 'ratsmah',
  'milleniumtvhs', 'twaryna', 'beyondthesummit', 'a1taoda', 'heflatv1', 'mrchocodota',
  'followkudes', 'brasilgamecup', 'gamerstudiotv2', 'bone7', 'sacriel', 'ponylionhd', 'imav3riq',
  'rivalxfactor', 'orb', 'kapitalistas', 'allgames4you', 'witwix', 'kinggothalion', 'professorbroman',
  'teawrex', 'dasmehdi', 'elajjaz', 'firedragon764', 'excessiveprofanity', 'radu_hs', 'neviilz',
  'lotharhs', 'massansc', 'mryagut'
];*/

function NotificationObserver() {
}

NotificationObserver.observe = function(streamManager) {
  streamManager.addListener('streams:online', function(streams) {
    for (var i = 0; i < streams.length; ++i) {
      notifyStreamOnline(streams[i]);
    }
  });

  function notifyStreamOnline(stream) {
    var options = {
      type: 'basic',
      title: stream.name + ' is live!',
      message: stream.status,
      contextMessage: stream.game,
      eventTime: Date.now(),
      iconUrl: stream.logo,
      isClickable: true,
      buttons: [{
        title: 'Watch now',
        iconUrl: '../icons/browser-action.png'
      }, {
        title: 'Dismiss',
        iconUrl: '../icons/dismiss.png'
      }]
    };

    var notificationId = stream.channel + ':' + stream.id;
    chrome.notifications.create(notificationId, options, function() {
      delayClearNotification(notificationId);
    });
  }

  function openStream(notificationId) {
    var parts = notificationId.split(':');
    chrome.tabs.create({ url: 'http://www.twitch.tv/' + encodeURIComponent(parts[0]) });
  }

  function delayClearNotification(notificationId) {
    setTimeout(function() {
      chrome.notifications.clear(notificationId, function() { });
    }, 15 * 60 * 1000);
  }

  chrome.notifications.onClicked.addListener(function(notificationId) {
    openStream(notificationId);
  });

  chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
    if (buttonIndex === 0 /* Watch now */) {
      openStream(notificationId);
    } else if (buttonIndex === 1 /* Dismiss */) {
      chrome.notifications.clear(notificationId, function() { });
    }
  });
};

function BadgeObserver() {
}

BadgeObserver.observe = function(streamManager, color) {
  streamManager.addListener('streams:online', function() {
    update(streamManager.getOnlineStreams());
  });

  streamManager.addListener('streams:offline', function() {
    update(streamManager.getOnlineStreams());
  });

  streamManager.addListener('streams:sync', function() {
    update(streamManager.getOnlineStreams());
  });

  function update(streams) {
    if (streams.length === 0) {
      removeBadge();
    } else {
      updateBadge(streams.length);
    }
  }

  function updateBadge(count) {
    var title = 'Twitch Stream Notifier: ';
    title += count + ' ' + (count === 1 ? 'stream' : 'streams') + ' online';

    chrome.browserAction.setTitle({ title: title });
    chrome.browserAction.setBadgeText({ text: String(count) });
    chrome.browserAction.setBadgeBackgroundColor({ color: color });
  };

  function removeBadge() {
    chrome.browserAction.setTitle({ title: 'Twitch Stream Notifier: No streams online' });
    chrome.browserAction.setBadgeText({ text: '' });
  }
}

function ExtensionManager() {
  var self = this;

  this.streamManager = null;

  this.start = function() {
    chrome.contextMenus.removeAll();

    chrome.runtime.onMessage.addListener(function(request, sender, respond) {
      switch (request.command) {
        case 'streams:list':
          self.getOptions(function(options) {
            respond({
              source: options.source,
              streams: self.streamManager.getOnlineStreams()
            });
          });
          break;

        case 'options:get':
          self.getOptions(respond);
          break;      

        case 'options:set':
          self.setOptions(request.options, respond);
          break;

        case 'options:show':
          showOptions();
          break;
      }

      return true;
    });

    chrome.runtime.onInstalled.addListener(function(details) {
      if (details.reason === 'install') {
        onFirstInstall();
      }
    });

    this.getOptions(function(options) {
      self.streamManager = new StreamManager(options.channels);

      BadgeObserver.observe(self.streamManager, '#6441a5');
      NotificationObserver.observe(self.streamManager);

      self.streamManager.watch();
    });
  };

  function onFirstInstall() {
    showOptions();
  }

  function showOptions() {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      chrome.tabs.create({ 'url': 'chrome://extensions/?options=' + chrome.runtime.id });
    }
  }

  this.getOptions = function(next) {
    chrome.storage.sync.get(function(result) {
      if (Object.keys(result).length == 0) {
        chrome.storage.sync.set(defaultOptions, function() {
          next(defaultOptions);
        });
      } else {
        next(result);
      }
    });
  };

  this.setOptions = function(options, next) {
    chrome.storage.sync.set(options, function() {
      self.streamManager.setChannels(options.channels);
      next();
    });
  };
}

function StreamManager(channels) {
  var self = this;

  this.channels = channels;
  this.streams = {};

  this.setChannels = function(channels) {
    this.channels = channels;
    syncStreams(channels);
  };

  this.watch = function() {
    syncStreams(this.channels);
    setInterval(function() {
      updateStreams(self.channels, true, function() { });
    }, 60 * 1000);
  };

  this.getOnlineStreams = function() {
    var streams = [];
    for (var channel in this.streams) {
      streams.push(this.streams[channel]);
    }

    return streams;
  };
  
  function syncStreams(channels) {
    updateStreams(channels, false, function() {
      self.emitEvent('streams:sync', [self.streams]);
    });
  }

  function updateStreams(channels, emitEvents, next) {
    fetchStreams(channels, function(twitchStreams) {
      if (!twitchStreams) {
        next();
        return;
      }

      var newStreams = {};

      for (var i = 0; i < twitchStreams.length; ++i) {
        var twitchStream = twitchStreams[i];

        newStreams[twitchStream._id] = {
          id: twitchStream._id,
          channel: twitchStream.channel.name,
          name: twitchStream.channel.display_name,
          game: twitchStream.game,
          viewers: twitchStream.viewers,
          thumbnail: twitchStream.preview.large,
          logo: twitchStream.channel.logo,
          status: twitchStream.channel.status,
          createdAt: twitchStream.created_at
        };
      }

      if (emitEvents) {
        var streamsOnline = [];
        var streamsOffline = [];

        for (var id in newStreams) {
          if (!self.streams[id]) {
            var stream = newStreams[id];
            
            var sinceStartMs = Date.now() - new Date(stream.createdAt);
            if (sinceStartMs <= (5 * 60 * 1000)) {
              streamsOnline.push(stream);
            }
          }
        }

        for (var id in self.streams) {
          if (!newStreams[id]) {
            var channel = self.streams[id].channel;
            streamsOffline.push(channel);
          }
        }
      }

      self.streams = newStreams;

      if (emitEvents) {
        if (streamsOnline.length) {
          self.emitEvent('streams:online', [streamsOnline]);
        }

        if (streamsOffline.length) {
          self.emitEvent('streams:offline', [streamsOffline]);
        }
      }

      next();
    });
  }

  function fetchStreams(channels, next) {
    if (!channels || !channels.length) {
      next([]);
      return;
    }

    var query = [];
    for (var i = 0; i < channels.length; ++i) {
      query.push(encodeURIComponent(channels[i]));
    }

    var url = 'https://api.twitch.tv/kraken/streams?limit=100&channel=' + query.join(',');

    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Client-ID', 'Twitch Stream Notifier (https://github.com/schmich/twitch-stream-notifier)');
    xhr.setRequestHeader('Cache-Control', 'private, no-store, no-cache, must-revalidate');
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4) {
        var response = JSON.parse(xhr.responseText);
        next(response.streams);
      }
    };

    xhr.send();
  }
}

StreamManager.prototype = Object.create(EventEmitter.prototype);

var extensionManager = new ExtensionManager();
extensionManager.start();
