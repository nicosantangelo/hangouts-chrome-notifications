(function() {
  var OS = null

  function Notification(data, options) {
    this.options = this.buildOptions(options)
    this.data = this.buildData(data)
    this.id = this.buildId(data)
  }

  Notification.prototype = {
    buildData: function(data) {
      var requireInteraction = this.shouldRequireInteraction()
      var buttons

      if (OS === 'win' && requireInteraction) {
        buttons = [{ title: 'Close', iconUrl: '' }]
      }

      return Object.assign({
        type: 'basic',
        requireInteraction: requireInteraction,
        buttons: buttons
      }, data)
    },

    buildId: function(data) {
      return [
        Notification.PREFIX,
        data.SID,
        data.title,
        data.message
      ].join('-')
    },

    buildOptions: function(options) {
      var settings = {
        expirationTime: 8,
        playSound: false
      }

      if (! options) return settings

      for (var key in settings) {
        if (options[key] != null) settings[key] = options[key]
      }

      return settings
    },

    shouldRequireInteraction: function() {
      return this.options.expirationTime > 10
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

  Notification.IS_WINDOWS = false // set later

  Notification.cache = {
    // notificationId: tabId
  }

  Notification.clear = function(notificationId) {
    chrome.notifications.clear(notificationId)
    delete Notification.cache[notificationId]
  }

  Notification.clearAll = function(notificationId) {
    chrome.notifications.getAll(function(notifications) {
      if (! notifications) return

      for (var id in notifications) {
        if (id.indexOf(Notification.PREFIX) !== -1) chrome.notifications.clear(id)
      }
    })
  }

  chrome.notifications.onButtonClicked.addListener(function(id) {
    Notification.clear(id)
  })

  chrome.runtime.getPlatformInfo(function(info) {
    OS = info.os
  })

  window.Notification = Notification
})()
