chrome.extension.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(notification) {

    chrome.notifications.create({
      type   : 'basic',
      title  : notification.title,
      message: notification.text,
      iconUrl: notification.avatar
    })

  })
})
