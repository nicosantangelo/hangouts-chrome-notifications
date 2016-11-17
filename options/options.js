/* Globals: configuration */

;(function() {
  var saveTimeout
  var notice = document.getElementById('notice')
  var expirationTime = document.getElementById('expiration-time')
  var expirationTimeValue = function() {
    var value = parseInt(expirationTime.value)
    return value && value > 0 ? value : null
  }
  var elements = {}

  configuration.forEachDefault(function (key, value) {
    elements[key] = document.getElementById(key)
  })

  configuration.get('expirationTime', function(time) {
    expirationTime.value = time || ''
  })

  // -----------------------------------------------------------------------------
  // Events

  document.getElementById('save').addEventListener('click', function save() {
    var newValues = { }

    configuration.forEachDefault(function (key, value) {
      if(elements[key]) {
        newValues[key] = elements[key].checked
      }
    })

    expirationTime.value = newValues['expirationTime'] = expirationTimeValue()

    configuration.set(newValues, function () {
      notice.classList.remove('hidden')
      window.scrollTo(0, document.body.scrollHeight)
      clearTimeout(saveTimeout)
      saveTimeout = setTimeout(function () { notice.classList.add('hidden') }, 4000)
    })
  }, false)


  var closeButtons = document.getElementsByClassName('close-notice')
  Array.prototype.forEach.call(closeButtons, function(closeButton) {
    closeButton.addEventListener('click', function() {
      closeButton.parentElement.classList.add('hidden')
    }, false)
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

  configuration.forEachCurrent(function(key, value) {
    if(elements[key]) {
      elements[key].checked = value
    }
  })
})()
