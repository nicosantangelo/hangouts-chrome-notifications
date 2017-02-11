;(function () {
  'use strict'

  var SELECTORS = {
    conversations: '.kgwWAf',

    conversation : '.c-P.yd',

    // The next two selectors are the same element
    conversationData: '[oid][cpar]',
    unread          : '.Bb.ee',

    online: '.Ux.Lz.flaeQ.pD',
    muted : '.wOu6w .zkWjbb.qpkz3b',

    mutedBanner: '.vfPIYe .Dg[role="alert"]',

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

  function Roster() {
    this.conversationsEl = null

    this.cache = {
      // id: {
        // name
        // unread
        // ...
      // }
    }
  }

  Roster.prototype = {
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

      for (var i = 0; i < conversations.length; i++) {
        fn.call(this, new Conversation(conversations[i]).getData())
      }
    },

    buildCache: function() {
      this.each(function(conversation) {
        this.cache[conversation.id] = conversation
      })
    },

    onChange: function(callback) {
      if(! this.conversationsEl) throw new Error('You need to start the Conversations object first')

      var changedConversations = []

      this.each(function(conversation) {
        var becameUnread = this.becameUnread(conversation)
        var becameOnline = this.becameOnline(conversation)

        if ( becameUnread || becameOnline ) {
          this.cache[conversation.id] = conversation

          conversation.changes = { becameUnread: becameUnread, becameOnline: becameOnline }

          if (! conversation.muted) {
            changedConversations.push(conversation)
          }
        }
      })

      if (changedConversations.length && ! this.isMuted()) {
        callback(changedConversations)
      }

      setTimeout(this.onChange.bind(this, callback), 1000)
    },

    becameUnread: function(conversation) {
      var inCache = this.cache[conversation.id]
      return conversation.unread && (! inCache || ! inCache.unread || inCache.text !== conversation.text)
    },

    becameOnline: function(conversation) {
      var inCache = this.cache[conversation.id]
      return conversation.online && (! inCache || ! inCache.online)
    },

    isMuted: function() {
      var unreadBanner = this.conversationsEl.querySelector(SELECTORS.mutedBanner)
      return unreadBanner.style.display !== 'none'
    }
  }


  // ==

  function Conversation(conversation) {
    this.conversation = conversation
  }

  Conversation.prototype = {
    getData: function() {
      return {
        id      : this.getAttribute('cpar'),
        text    : this.getText(),
        name    : this.getName(),
        avatar  : this.getActiveAvatar(),
        multiple: this.isMultiple(),
        online  : this.isOnline(),
        muted   : this.isMuted(),
        unread  : this.isUnread()
      }
    },

    isOnline: function() {
      return !! this.find('online')
    },

    isMultiple: function() {
      return ! this.conversation.getAttribute('hovercard-oid')
    },

    isUnread: function() {
      var unreadSelectors = SELECTORS.unread.split('.').slice(1)
      var classList = this.conversation.classList
      return unreadSelectors.every(function(className) { return classList.contains(className) })
    },

    isMuted: function() {
      return this.find('muted').getAttribute('aria-label') === 'This conversation is muted.'
    },

    getText: function() {
      return this.find('text').textContent
    },

    getName: function() {
      return this.find('name').textContent
    },

    getActiveAvatar: function() {
      var avatar = ''

      if (this.isMultiple()) {
        var author = this.getActiveName()

        for(var i = 0, avatars = this.findAll('avatar'); i < avatars.length; i++) {
          if (avatars[i].alt.search(author) !== -1) {
            avatar = avatars[i].src
            break
          }
        }
      }

      return avatar || this.find('avatar').src
    },

    getActiveName: function() {
      var text = this.find('text').textContent
      return text.split(':')[0]
    },

    getAttribute: function(name) {
      return this.conversation.getAttribute(name)
    },

    find: function(selector) {
      return this.conversation.querySelector(SELECTORS[selector])
    },

    findAll: function(selector) {
      return this.conversation.querySelectorAll(SELECTORS[selector])
    }
  }


  // ==

  var notifications = {
    post: function(notification) {
      getDataUri(notification.avatar, function(dataUri) {
        notification.tabActive = ! document.hidden
        notification.avatar = dataUri
        notification.SID = SID

        var port = chrome.extension.connect({ name: 'Hangouts' })
        port.postMessage(notification)
      })
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

  new Roster().start(function(roster) {
    if (! roster) return

    roster.onChange(function(changes) {
      changes.forEach(notifications.post)
    })
  })
})()
