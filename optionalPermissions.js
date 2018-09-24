;(function() {
  var optionalPermissions = {
    isGranted: function(name, callback) {
      chrome.permissions.contains({
        permissions: [name]
      }, function(isGranted) {
        callback(isGranted)
      })
    },
    request: function(name, callback) {
      chrome.permissions.request({
        permissions: [name]
      }, function(wasAllowed) {
        callback(wasAllowed)
      })
    }
  }

  window.optionalPermissions = optionalPermissions
})()
