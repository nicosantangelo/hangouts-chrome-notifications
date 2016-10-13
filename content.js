;(function () {
  'use strict'

  var SELECTORS = {
    roster: '.kgwWAf',
    unread: '.c-P.yd .Bb.ee',

    avatar: 'img.Yf',
    name  : 'div.lt.mG',
    text  : 'ng sQR2Rb'
  }

  function Finder(selector) {
    var timeoutId = null
    var times = 0

    this.find = function find(onFind, onError) {
      var element = document.querySelector(selector)

      clearTimeout(timeoutId)

      if (element) {
        onFind && onFind(element)
        return
      }

      if (times < 3) {
        times += 1
        timeoutId = setTimeout(function() { find(onFind, onError) }, 2000)
      } else {
        onError && onError()
      }
    }
  }

  // ==

  function Roster() {
    this.roaster = null
  }
  Roster.prototype = {
    findRoaster: function(onFind) {
      onFind = onFind || function() {}

      if (this.roaster) {
        return onFind.call(this)
      }

      new Finder(SELECTORS.roster).find(function(roster) {
        this.roaster = roaster
        onFind.call(this)
      }.bind(this))
    },
    onUnreadChat: function(callback) {
      this.findRoaster(function() {
        var unreadChats = roster.querySelectorAll(SELECTORS.unread)
        console.log('Found', unreadChats.length, 'unread chats')

        if (unreadChats.length) {
          callback(unreadChats)
        }

        setTimeout(function() { findUnread() }, 1000)
      })
    }
  }

  // ==

  var notifications = {
    build: function(unreadChat) {
      function find(selector) {
        return unreadChat.querySelector(SELECTORS[selector])
      }

      return {
        name  : find('name').textContent,
        text  : find('text').textContent,
        avatar: find('avatar').src
      }
    },

    post: function(unreadChat) {
      var notification = notifications.build(unreadChat)

      getDataUri(notification.avatar, function(dataUri) {
        var port = chrome.extension.connect({ name: 'Hangouts' })

        port.postMessage({
          title : notification.name,
          text  : notification.text,
          avatar: dataUri
        })

        port.onMessage.addListener(function(msg) {
          console.log("message recieved " + msg)
        })
      })
    }
  }

  // ----------------------------------------------------------
  // Utils

  function getDataUri(url, callback) {
    var image = new Image()

    image.setAttribute('crossOrigin', 'anonymous')

    image.onload = function () {
      var canvas = document.createElement('canvas')
      canvas.width = this.naturalWidth // or 'width' if you want a special/scaled size
      canvas.height = this.naturalHeight // or 'height' if you want a special/scaled size

      canvas.getContext('2d').drawImage(this, 0, 0)

      callback(canvas.toDataURL('image/png'))
    }

    image.src = url
  }

  // ----------------------------------------------------------
  // Main

  new Roaster().onUnreadChat(function(unread) {
    console.log({ unread })
    var firstUnread = unread[0]

    console.log({ notification: notifications.build(firstUnread) })

    notifications.post(firstUnread)
  })

})()
