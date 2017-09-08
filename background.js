/* Globals: configuration */


// ----------------------------------------------------------
// Messages from the front-end

chrome.extension.onConnect.addListener(function(port) {
  chrome.notifications.onClicked.addListener(function(notificationId) {
    var tabId = Notification.cache[notificationId]

    if (tabId) {
      chrome.tabs.update(tabId, {
        selected   : true,
        active     : true
      }, function(tab) {
        chrome.windows.update(tab.windowId, { focused: true }, function() { Notification.clear(notificationId) })
      })
    }
  })

  port.onMessage.addListener(function(data, port) {
    var tab = port.sender.tab
    var changes = data.changes

    configuration.get(function(config) {
      if (isUrlDisabled(tab.url, config.disabledUrls)) return
      if (changes.becameOnline && ! config.showOnlineNotifications) return
      if (changes.becameUnread && ! config.showUnreadNotifications) return
      if (config.muteAllExcept && config.muteAllExcept.indexOf(data.name) === -1) return
      if (data.tabActive && config.fireOnInactiveTab) return

      var notificationData = {
        title  : data.name,
        iconUrl: data.avatar,
        message: changes.becameOnline ? 'Is now online' : data.text,
        contextMessage: 'From ' + getBasename(tab.url)
      }

      var notification = new Notification(notificationData, {
        expirationTime: config.expirationTime,
        playSound: config.playSound
      })

      notification.send(tab.id)
    })
  })

  function isUrlDisabled(url, disabledUrls) {
    disabledUrls = disabledUrls || []

    for(var i = 0; i < disabledUrls.length; i++) {
      if (url.search(disabledUrls[i]) !== -1) return true
    }
  }

  function getBasename(url) {
    return url.replace(/https?:\/\//, '').split('/')[0] // https://mail.google.com/mail/u/0/#inbox => mail.google.com
  }
})


// ----------------------------------------------------------
// onMessage listener

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch(request.type) {
    case 'icon':
      let status = request.active ? '' : 'inactive_'

      chrome.browserAction.setIcon({
        path: {
          19: 'icons/' + status + '19.png',
          38: 'icons/' + status + '38.png'
        },
        tabId: sender.tab.id
      })
      break
  }
})


// ----------------------------------------------------------
// On installed/updated

chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason !== 'install' && details.reason !== 'update') return

  var options = {}

  if(details.reason === 'update') {
    options['justUpdated'] = 1
  }

  if(details.reason === 'install') {
    options['firstInstall'] = true
    options['justUpdated'] = 0
  }

  chrome.storage.local.set(options, function () {
    var OPTIONS_URL = chrome.extension.getURL('options/options.html')
    chrome.tabs.create({ url: OPTIONS_URL })
  })

  Notification.clearAll()
})



// ----------------------------------------------------------
// Notification

function Notification(data, options) {
  this.data = this.buildData(data)
  this.id = this.buildId()
  this.options = this.buildOptions(options)
}

Notification.prototype = {
  buildData: function(data) {
    return Object.assign({ type: 'basic', }, data)
  },

  buildId: function() {
    return [
      Notification.PREFIX,
      this.data.SID,
      this.data.name,
      this.data.text
    ].join('-')
  },

  buildOptions: function(options) {
    var settings = {
      expirationTime: 8,
      playSound: false
    }

    if (! options) return options

    for (key in settings) {
      if (options[key] != null) settings[key] = options[key]
    }

    return settings
  },

  send: function(tabId) {
    if (this.options.playSound) {
      this.playSound()
    }

    chrome.notifications.create(this.id, this.data, function() {
      Notification.cache[this.id] = tabId
      setTimeout(this.clear.bind(this), this.options.expirationTime * 1000)
    }.bind(this))
  },

  playSound: function() {
    var ding = new Audio()
    ding.src = chrome.extension.getURL('audio/ding.mp3')
    ding.play()
  },

  clear: function() {
    Notification.clear(this.id)
  }
}

Notification.PREFIX = '[HangoutsNotifications]'

Notification.cache = {
  // notificationId: tabId
}

Notification.clear = function(notificationId) {
  chrome.notifications.clear(notificationId)
  delete Notification.cache[notificationId]
}

Notification.clearAll = function(notificationId) {
  chrome.notifications.getAll(function(notifications) {
    for (var id in notifications) {
      if (id.indexOf(Notification.PREFIX) !== -1) chrome.notifications.clear(id)
    }
  })
}
