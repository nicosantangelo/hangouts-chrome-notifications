(function() {
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

  window.Notification = Notification
})()
