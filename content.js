;(function () {
  'use strict'

  var SELECTORS = {
    conversations: '.kgwWAf',

    conversation : '.c-P.yd',

    // The next two selectors are the same element
    conversationData: '[hovercard-oid]',
    unread          : '.Bb.ee',

    muted: '.vfPIYe .Dg[role="alert"]',

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
    this.conversationsEl = null

    this.cache = {
      // oid: {
        // name
        // unread
      // }
    }
  }

  Conversation.data = function(conversation) {
    function find(selector) {
      return conversation.querySelector(SELECTORS[selector])
    }

    var unreadSelectors = SELECTORS.unread.split('.').slice(1)

    return {
      oid   : conversation.getAttribute('hovercard-oid'),
      name  : find('name').textContent,
      text  : find('text').textContent,
      avatar: find('avatar').src,
      unread: unreadSelectors.every(function(className) { return conversation.classList.contains(className) })
    }
  }

  Conversation.prototype = {
    start: function(onFind) {
      if (this.conversationsEl) {
        return onFind(this)
      }

      new Finder(SELECTORS.conversations).find(function(conversations) {
        this.conversationsEl = conversations
        this.buildCache()
        onFind(this)
      }.bind(this))
    },

    findUnread: function() {
      var unreadConversations = this.conversationsEl.querySelectorAll(SELECTORS.unread)
      console.log('Found', unreadConversations.length, 'unread conversations')
      return unreadConversations
    },

    buildCache: function() {
      var conversationElements = this.conversationsEl.querySelectorAll(SELECTORS.conversationData)
      var conversation

      for (var i = 0; i < conversationElements.length; i++) {
        conversation = Conversation.data(conversationElements[i])
        this.cache[conversation.oid] = conversation
      }
    },

    onUnread: function(callback) {
      if(! this.conversationsEl) throw new Error('You need to start the Conversations object first')

      var unreadConversationElements = this.findUnread()
      var unreadConversations = []
      var unreadConversation
      var inCache

      for (var i = 0; i < unreadConversationElements.length; i++) {
        unreadConversation = Conversation.data(unreadConversationElements[i])
        inCache = this.cache[unreadConversation.oid]

        if (! inCache || ! inCache.unread || inCache.text !== unreadConversation.text) {
          unreadConversations.push(unreadConversation)
          this.cache[unreadConversation.oid] = unreadConversation
        }
      }

      if (unreadConversations.length && ! this.isMuted()) {
        callback(unreadConversations)
      }

      setTimeout(function() {
        this.onUnread(callback)
      }.bind(this), 1000)
    },

    isMuted: function() {
      var unreadBanner = this.conversationsEl.querySelector(SELECTORS.muted)
      return unreadBanner.style.display !== 'none'
    }
  }

  // ==

  var notifications = {
    build: function(unreadConversation) {
      return Conversation.data(unreadConversation)
    },

    post: function(notification) {
      // var notification = notifications.build(unreadChat)

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

    conversation.onUnread(function(unreads) {
      unreads.forEach(notifications.post)
    })
  })

})()
