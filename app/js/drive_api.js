isEventSource = function(obj) {
  obj.e_ = $({});
  obj.on = function() {
    obj.e_.on.apply(obj.e_, arguments);
  };
  obj.off = function() {
    obj.e_.off.apply(obj.e_, arguments);
  };
  obj.trigger = function() {
    obj.e_.trigger.apply(obj.e_, arguments);
  };
};

var drive = {};


drive.Api = function(clientId, scopes, opt_userId) {
  this.clientId_ = clientId;
  this.scopes_ = scopes;
  this.scopes_.push('openid'); // Scope used to identify the user.
  this.userId_ = opt_userId;
  isEventSource(this);
};


drive.Api.prototype.start = function() {
  gapi.load('auth:client,drive-share', function() {
    this.authorize();
  }.bind(this));
};


drive.Api.prototype.authorize = function(opt_withPopup) {
  gapi.auth.authorize({
    client_id: this.clientId_,
    scope: this.scopes_,
    user_id: this.userId_,
    immediate: !opt_withPopup
  }, this.handleAuthResult_.bind(this));
};

drive.Api.prototype.getUserId_ = function(callback) {
  gapi.client.load('oauth2', 'v2', function() {
    this.execute_(gapi.client.oauth2.userinfo.get(),
      function(resp) {
        if (resp.id) {
          this.trigger('userId', resp.id);
        };
      }.bind(this));
  }.bind(this));
};


drive.Api.prototype.handleAuthResult_ = function(result) {
  if (result && !result.error) {
    this.trigger('authed');
    if (!this.userId_) {
      this.getUserId_();
    }
  } else {
    this.trigger('requirespopup');
  }
};


drive.Api.prototype.loadAndExecute_ = function(fn, callback) {
  gapi.client.load('drive', 'v2', function() {
    this.execute_(fn.apply(this), callback);
  }.bind(this));
};

drive.Api.prototype.execute_ = function(request, callback) {
  // Check auth?
  request.execute(function(result) {
    if (result['error']) {
      this.handleError_(result.code, result.message);
    } else {
      callback.apply(callback, [result]);
    }
  }.bind(this));
};


drive.Api.prototype.list = function(callback) {
  this.loadAndExecute_(function() {
    return gapi.client.drive.files.list({});
  }, callback);
};


drive.Api.prototype.get = function(id, callback, opt_includeContent) {
  this.loadAndExecute_(function() {
    return gapi.client.drive.files.get({
      'fileId' : id
    });
  }, opt_includeContent ? this.getFileContent_.bind(this, callback) : callback);
};


drive.Api.prototype.getFileContent_ =
    function(callback, file) {
  $.ajax({
    url: file['downloadUrl'],
    beforeSend: function (xhr) {
      xhr.setRequestHeader('Authorization',
          'Bearer ' + gapi.auth.getToken().access_token);
    },
    dataType: 'text',
    error: this.handleXhrError_.bind(this),
    success: function(text) {
      var newFile = $.extend({}, file);
      newFile['content'] = text;
      callback(newFile);
    }
  });
};


drive.Api.prototype.createMultipartBody_ =
    function(boundary, metadata, content, opt_base64Encoded) { 
  const delimiter = "\r\n--" + boundary + "\r\n";
  const close_delim = "\r\n--" + boundary + "--";

  return delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: ' + metadata.mimeType + '\r\n' +
      (opt_base64Encoded ? 'Content-Transfer-Encoding: base64\r\n' : '') +
      '\r\n' +
      content +
      close_delim;
};


drive.Api.prototype.createRequest_ =
    function (requestData, metadata, opt_content, opt_base64Encoded) {
  if (opt_content) {
    const boundary = '-------758123749817234989129';
    requestData['params'] = {'uploadType': 'multipart'};
    requestData['headers'] = {
        'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
    }
    requestData['body'] = this.createMultipartBody_(
        boundary, metadata, opt_content, opt_base64Encoded);
  } else {
    requestData['body'] = metadata;
  }
  return gapi.client.request(requestData);
};

drive.Api.prototype.insert =
    function(callback, title, mimeType, opt_content, opt_base64Encoded) {
  var metadata = {
    title: title,
    mimeType: mimeType
  }
  var requestData = {
    'path': '/upload/drive/v2/files',
    'method': 'POST',
  }
  var request = this.createRequest_(
      requestData, metadata, opt_content, opt_base64Encoded);
  this.execute_(request, callback);
};


drive.Api.prototype.update =
    function(callback, metadata, opt_content, opt_base64Encoded) {
  var requestData = {
    'path': '/upload/drive/v2/files/' + metadata['id'],
    'method': 'PUT',
  }
  var request = this.createRequest_(
      requestData, metadata, opt_content, opt_base64Encoded);
  this.execute_(request, callback);
};

drive.Api.prototype.delete =
    function(id, callback) {
  this.loadAndExecute_(function() {
    return gapi.client.drive.files.delete({
      'fileId' : id
    });
  }, callback);
};


drive.Api.prototype.handleXhrError_ = function(xhr) {
  this.handleError_(xhr.status, xhr.statusText);
};

drive.Api.prototype.handleError_ = function(code, message) {
  this.trigger('error', [code, message]);
};