;(function () {
  'use strict'

  var SELECTORS = {
    conversations: '.kgwWAf',

    conversation : '.c-P.yd',

    // The next two selectors are the same element
    conversationData: '[hovercard-oid]',
    unread          : '.Bb.ee',

    online: '.Ux.Lz.flaeQ.pD',

    muted: '.vfPIYe .Dg[role="alert"]',

    avatar: 'img.Yf',
    name  : 'div.lt.mG',
    text  : '.ng.sQR2Rb'
  }

  function Retrier(method, cap, delay) {
    var timeoutId = null
    var times = 0
    cap = cap || 3
    delay = delay || 2000

    this.find = function find(onFind, onError) {
      var element = method()

      clearTimeout(timeoutId)

      if (element) {
        onFind && onFind(element)
        return
      }

      if (times < cap) {
        times += 1
        timeoutId = setTimeout(function() { find(onFind, onError) }, delay)
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
        // ...
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
      online: !! find('online'),
      unread: unreadSelectors.every(function(className) { return conversation.classList.contains(className) })
    }
  }

  Conversation.prototype = {
    start: function(onFind) {
      if (this.conversationsEl) {
        return onFind(this)
      }

      new Retrier(function() {
        return document.querySelector(SELECTORS.conversations)
      }).find(function(conversations) {
        this.conversationsEl = conversations
        this.buildCache()
        onFind(this)
      }.bind(this))
    },

    each: function(fn) {
      var conversations = this.conversationsEl.querySelectorAll(SELECTORS.conversationData)
      console.log('Found', conversations.length, 'conversations')

      for (var i = 0; i < conversations.length; i++) {
        fn.call(this, Conversation.data(conversations[i]))
      }
    },

    buildCache: function() {
      this.each(function(conversation) {
        this.cache[conversation.oid] = conversation
      })
    },

    onChange: function(callback) {
      if(! this.conversationsEl) throw new Error('You need to start the Conversations object first')

      var changedConversations = []

      this.each(function(conversation) {
        var becameUnread = this.becameUnread(conversation)
        var becameOnline = this.becameOnline(conversation)

        if ( becameUnread || becameOnline ) {
          this.cache[conversation.oid] = conversation

          conversation.changes = { becameUnread: becameUnread, becameOnline: becameOnline }
          changedConversations.push(conversation)
        }
      })

      if (changedConversations.length && ! this.isMuted()) {
        callback(changedConversations)
      }

      setTimeout(this.onChange.bind(this, callback), 1000)
    },

    becameUnread: function(conversation) {
      var inCache = this.cache[conversation.oid]
      return conversation.unread && (! inCache || ! inCache.unread || inCache.text !== conversation.text)
    },

    becameOnline: function(conversation) {
      var inCache = this.cache[conversation.oid]
      return conversation.online && (! inCache || ! inCache.online)
    },

    isMuted: function() {
      var unreadBanner = this.conversationsEl.querySelector(SELECTORS.muted)
      return unreadBanner.style.display !== 'none'
    }
  }

  // ==

  var notifications = {
    post: function(notification) {
      if(document.hidden) {
        getDataUri(notification.avatar, function(dataUri) {
          notification.avatar = dataUri
          notification.SID = SID

          var port = chrome.extension.connect({ name: 'Hangouts' })
          port.postMessage(notification)
        })
      }
    }
  }

  // ----------------------------------------------------------
  // Utils

  var SID = (function getSID() {
    var match = document.cookie.match(/SID=([^\;]+)/)
    return match && match[1]
  })()

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

    conversation.onChange(function(changes) {
      changes.forEach(notifications.post)
    })
  })
})()
