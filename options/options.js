/* Globals: configuration */

;(function() {

  // -----------------------------------------------------------------------------
  // Models

  var expirationTime = {
    parseValue: function(value) {
      value = parseInt(value, 10)

      if (value && value > 0) {
        return value
      }
    }
  }

  var disabledDomains = {
    toArray: function(domains) {
      var array = []

      if (domains) {
        domains = domains.split('\n')

        for(var i = 0; i < domains.length; i++) {
          if (array.indexOf(domains[i]) === -1) array.push(domains[i])
        }
      }

      return array
    },

    fromArray: function(domains) {
      return domains  ? domains.join('\n') : ''
    }
  }

  var options = {
    htmlElements: {},

    setCurrentSaved: function() {
      configuration.forEachCurrent(function(key, value) {
        var element = options.htmlElements[key]

        if(element.type === 'checkbox') {
          element.checked = value
        } else {
          if(key === 'disabledDomains') {
            element.value = disabledDomains.fromArray(value)
          } else {
            element.value = value
          }
        }
      })
    },

    getFromHTML: function() {
      var newValues = {}

      configuration.forEachDefault(function(key, value) {
        var element = options.htmlElements[key]
        if (! element) return

        if(element.type === 'checkbox') {
          newValues[key] = element.checked
        } else {
          if(key === 'disabledDomains') {
            newValues[key] = disabledDomains.toArray(element.value)
          } else if(key === 'expirationTime') {
            newValues[key] = expirationTime.parseValue(element.value)
          } else {
            newValues[key] = element.value
          }
        }
      })

      return newValues
    }
  }
  configuration.forEachDefault(function (key, value) {
    options.htmlElements[key] = document.getElementById(key) // setup the htmlElements property
  })


  // -----------------------------------------------------------------------------
  // Events

  var saveTimeout = null

  addEventListener('#js-save', 'click', function save() {
    var notice = document.getElementById('notice')
    var newValues = options.getFromHTML()

    configuration.set(newValues, function () {
      notice.classList.remove('hidden')
      window.scrollTo(0, document.body.scrollHeight)
      clearTimeout(saveTimeout)
      saveTimeout = setTimeout(function() { notice.classList.add('hidden') }, 4000)
    })

    options.setCurrentSaved()
  })


  addEventListener('.js-disable-example', 'click', function() {
    var domainsTextarea = document.getElementById('disabledDomains')
    var currentDomains = disabledDomains.toArray(domainsTextarea.value)
    var href = this.dataset.href

    if (currentDomains.length === 0) {
      domainsTextarea.value = href
    } else if (currentDomains.indexOf(href) === -1) {
      domainsTextarea.value += '\n' + href
    }
  })


  addEventListener('#js-close-notice', 'click', function() {
    this.parentElement.classList.add('hidden')
  })


  // -----------------------------------------------------------------------------
  // Start

  chrome.storage.local.get({ justUpdated: 0 }, function(items) {
    if (items.justUpdated > 0) {
      var newItems = document.getElementsByClassName('new')

      for(var i = 0; i < newItems.length; i++) {
        newItems[i].classList.remove('hidden')
      }

      items.justUpdated -= 1

      chrome.storage.local.set({ justUpdated: items.justUpdated })
    }
  })

  options.setCurrentSaved()


  // -----------------------------------------------------------------------------
  // Utils

  function addEventListener(selector, event, callback) {
    var elements = document.querySelectorAll(selector)

    Array.prototype.forEach.call(elements, function(element) {
      element.addEventListener(event, callback, false)
    })
  }
})()
