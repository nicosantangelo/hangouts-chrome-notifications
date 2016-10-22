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

      new Finder(SELECTORS.conversations).find(function(conversations) {
        this.conversationsEl = conversations
        this.buildCache()
        onFind(this)
      }.bind(this))
    },

    each: function(fn) {
      var conversations = this.conversationsEl.querySelectorAll(SELECTORS.conversationData)
      // console.log('Found', conversations.length, 'conversations')

      for (var i = 0; i < conversations.length; i++) {
        fn.call(this, conversations[i])
      }
    },

    buildCache: function() {
      this.each(function(conversationElement) {
        var conversation = Conversation.data(conversationElement)
        this.cache[conversation.oid] = conversation
      })
    },

    onChange: function(callback) {
      if(! this.conversationsEl) throw new Error('You need to start the Conversations object first')

      var changedConversations = []

      this.each(function(conversationElement) {
        var conversation = Conversation.data(conversationElement)
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
      return ! inCache || (! inCache.unread && conversation.unread) || inCache.text !== conversation.text
    },

    becameOnline: function(conversation) {
      var inCache = this.cache[conversation.oid]
      return ! inCache || (! inCache.online && conversation.online)
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
      if(document.hidden) {
        getDataUri(notification.avatar, function(dataUri) {
          notification.avatar = dataUri

          var port = chrome.extension.connect({ name: 'Hangouts' })
          port.postMessage(notification)
        })
      }
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

    conversation.onChange(function(changes) {
      changes.forEach(notifications.post)
    })
  })
})()
