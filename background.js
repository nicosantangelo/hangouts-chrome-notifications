/* Globals: configuration */

//
// Messages from the front-end
//

chrome.extension.onConnect.addListener(function(port) {
  var tabs = {
    // notificationId: tabId
  }

  chrome.notifications.onClicked.addListener(function(notificationId) {
    var tabId = tabs[notificationId]

    if (tabId) {
      chrome.tabs.update(tabId, {
        selected   : true,
        active     : true
      }, function(tab) {
        chrome.windows.update(tab.windowId, { focused: true }, function() { clearNotification(notificationId) })
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
      if (data.tabActive && config.fireOnInactiveTab) return

      var notificationId = data.SID + '-' + data.name
      var text = changes.becameOnline ? 'Is now online' : data.text
      var url = tab.url.replace(/https?:\/\//, '').split('/')[0] // https://mail.google.com/mail/u/0/#inbox => mail.google.com

      createNotification(notificationId, {
        title  : data.name,
        iconUrl: data.avatar,
        message: text,
        contextMessage: 'From ' + url
      }, {
        tabId: tab.id,
        expirationTime: config.expirationTime
      })
    })
  })

  function createNotification(notificationId, notification, options) {
    notification.type = 'basic'
    notification.requireInteraction = !! options.expirationTime

    chrome.notifications.create(notificationId, notification, function(notificationId) {
      tabs[notificationId] = options.tabId

      if (notification.requireInteraction) {
        setTimeout(function() { clearNotification(notificationId) }, options.expirationTime * 1000)
      }
    })
  }

  function clearNotification(notificationId) {
    chrome.notifications.clear(notificationId)
    delete tabs[notificationId]
  }

  function isUrlDisabled(url, disabledUrls) {
    disabledUrls = disabledUrls || []

    for(var i = 0; i < disabledUrls.length; i++) {
      if (url.search(disabledUrls[i]) !== -1) return true
    }
  }
})


//
// On installed/updated
//

chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason !== 'install' && details.reason !== 'update') return

  var options = {}

  if(details.reason === 'install') {
    options['firstInstall'] = true
  }

  if(details.reason === 'update') {
    options['justUpdated'] = 2
  }

  chrome.storage.local.set(options, function () {
    var OPTIONS_URL = chrome.extension.getURL('options/options.html')
    chrome.tabs.create({ url: OPTIONS_URL })
  })
})
