/* Globals: configuration, Notification */


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

      data.message = changes.becameOnline ? 'Is now online' : data.text,
      data.contextMessage = 'From ' + getBasename(tab.url)

      var notification = new Notification(data, {
        expirationTime: config.expirationTime,
        playSound: config.playSound
      })

      notification.send(tab.id)
    })
  })
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


// -----------------------------------------------------------------------------
// Extension icon popup clicked

chrome.browserAction.onClicked.addListener(openOptionsPage)


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
// Utils

function isUrlDisabled(url, disabledUrls) {
  disabledUrls = disabledUrls || []

  for(var i = 0; i < disabledUrls.length; i++) {
    if (url.search(disabledUrls[i]) !== -1) return true
  }
}

function getBasename(url) {
  return url.replace(/https?:\/\//, '').split('/')[0] // https://mail.google.com/mail/u/0/#inbox => mail.google.com
}

function openOptionsPage() {
  let optionsURL = chrome.extension.getURL('options/options.html')
  chrome.tabs.create({ url: optionsURL })
}
