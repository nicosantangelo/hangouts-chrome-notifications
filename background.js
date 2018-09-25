/* Globals: configuration, Notification, optionalPermissions */


// ----------------------------------------------------------
// Messages from the front-end

chrome.extension.onConnect.addListener(function(port) {
  chrome.notifications.onClicked.addListener(function(notificationId) {
    let tabId = Notification.cache[notificationId]

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
    let tab = port.sender.tab
    let changes = data.changes

    configuration.get(function(config) {
      if (isUrlDisabled(tab.url, config.disabledUrls)) return
      if (changes.becameOnline && ! config.showOnlineNotifications) return
      if (changes.becameUnread && ! config.showUnreadNotifications) return
      if (config.muteAllExcept && ! containsAnyName(data.name, config.muteAllExcept)) return
      if (! changes.becameOnline && config.messageKeywords && ! containsAnyKeywords(data.text, config.messageKeywords)) return
      if (data.tabActive && config.fireOnInactiveTab) return

      let notificationData = {
        title: data.name,
        iconUrl: data.avatar,
        message: changes.becameOnline ? 'Is now online' : data.text,
        contextMessage: 'From ' + getBasename(tab.url)
      }

      new Notification(notificationData, {
        expirationTime: config.expirationTime,
        playSound: config.playSound
      }).send(tab.id)
    })
  })
})


// ----------------------------------------------------------
// onMessage listener

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  switch (request.type) {
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

chrome.browserAction.onClicked.addListener(function() {
  let defaultURL = 'hangouts.google.com'
  let validURLs = [defaultURL, 'mail.google.com', 'gmail.com', 'inbox.google.com']

  configuration.get('iconClickURL', function(url) {
    const basename = isValidURL(url) ? getBasename(url) : defaultURL

    optionalPermissions.isGranted('tabs', function(isGranted) {
      if (isGranted) {
        chrome.tabs.query({ url: 'https://' + basename + '/*' }, function(tabs) {
          if (tabs && tabs.length) {
            chrome.tabs.update(tabs[0].id, { selected: true, active: true })
          } else {
            chrome.tabs.create({ url: 'https://' + basename })
          }
        })
      } else {
        chrome.tabs.create({ url: 'https://' + basename })
      }
    })
  })

  function isValidURL(url) {
    return url && validURLs.includes(getBasename(url))
  }
})


// ----------------------------------------------------------
// On installed/updated

chrome.runtime.onInstalled.addListener(function(details) {
  if (details.reason !== 'install' && details.reason !== 'update') return

  let options = {}
  let callback = function() {}

  Notification.clearAll()

  if (details.reason === 'update') {
    getCurrentTab(function(tab) {
      new Notification({
        title  : 'Hangouts Notifications updated',
        iconUrl: chrome.extension.getURL('icons/128.png'),
        message: 'You might need to refresh Hangouts tabs for this extension to work'
      }).send(tab.id)
    })

    options['justUpdated'] = 1
  }

  if (details.reason === 'install') {
    options['firstInstall'] = true
    options['justUpdated'] = 0
    callback = openOptionsPage
  }

  chrome.storage.local.set(options, callback)
})


// ----------------------------------------------------------
// Utils

function getCurrentTab(callback) {
  chrome.tabs.query({ currentWindow: true, active: true }, function (tabs) {
    callback(tabs[0])
  })
}

function isUrlDisabled(url, disabledUrls) {
  disabledUrls = disabledUrls || []

  for (let i = 0; i < disabledUrls.length; i++) {
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

function containsAnyName(fullName, names) {
  return splitText(names).some(function(name) {
    return containsAnyKeywords(name, fullName)
  })
}

function containsAnyKeywords(text, keywords) {
  if (! keywords) return false

  text = text.toLowerCase()

  return splitText(keywords).some(function(keyword) {
    return text.search(keyword.toLowerCase()) !== -1
  })
}

function splitText(text) {
  return text.split(/,\s*/)
}
