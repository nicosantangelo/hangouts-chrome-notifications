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
        chrome.windows.update(tab.windowId, { focused: true }, function() {
          chrome.notifications.clear(notificationId)
          delete tabs[notificationId]
        })
      })
    }
  })

  port.onMessage.addListener(function(data, port) {
    var tab = port.sender.tab
    var notificationId = data.SID + '-' + data.name

    var text = data.changes.becameOnline ? 'Is now online' : data.text
    var url = tab.url.replace(/https?:\/\//, '').split('/')[0] // https://mail.google.com/mail/u/0/#inbox => mail.google.com

    chrome.notifications.create(notificationId, {
      type   : 'basic',
      title  : data.name,
      iconUrl: data.avatar,
      message: text,
      contextMessage: 'From ' + url,
    }, function(notificationId) {
      tabs[notificationId] = tab.id
    })
  })

})
