;(function () {
  'use strict'

  var SELECTORS = {
    conversations: '.kgwWAf',
    conversation : '.c-P.yd',
    unread       : '.Bb.ee',

    avatar: 'img.Yf',
    name  : 'div.lt.mG',
    text  : '.ng.sQR2Rb'
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

  function Conversation() {
    this.conversations = null
  }
  Conversation.prototype = {
    start: function(onFind) {
      if (this.conversations) {
        return onFind(this)
      }

      new Finder(SELECTORS.conversations).find(function(conversations) {
        this.conversations = conversations
        onFind(this)
      }.bind(this))
    },
    findUnread: function() {
      var unreadConversations = this.conversations.querySelectorAll(SELECTORS.unread)
      console.log('Found', unreadConversations.length, 'unread conversations')
      return unreadConversations
    },
    onUnread: function(callback) {
      if(! this.conversations) throw new Error('You need to start the Conversations object first')

      var unreadConversations = this.findUnread()

      if (unreadConversations.length) {
        callback(unreadConversations)
      }

      // setTimeout(onUnread, 1000)
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

  new Conversation().start(function(conversation) {
    if (! conversation) return

    conversation.onUnread(function(unread) {
      var firstUnread = unread[0]
      notifications.post(firstUnread)
    })
  })

})()
