var util = {};

util.handleFSError = function(e) {
  var msg = '';

  switch (e.code) {
    case FileError.QUOTA_EXCEEDED_ERR:
      msg = 'QUOTA_EXCEEDED_ERR';
      break;
    case FileError.NOT_FOUND_ERR:
      msg = 'NOT_FOUND_ERR';
      break;
    case FileError.SECURITY_ERR:
      msg = 'SECURITY_ERR';
      break;
    case FileError.INVALID_MODIFICATION_ERR:
      msg = 'INVALID_MODIFICATION_ERR';
      break;
    case FileError.INVALID_STATE_ERR:
      msg = 'INVALID_STATE_ERR';
      break;
    default:
      msg = 'Unknown Error';
      break;
  }

  console.warn('FS Error:', e, msg);
};

/**
 * @param {FileEntry} entry
 * @param {string} content
 * @param {Function} onsuccess
 * Truncate the file and write the content.
 */
util.writeFile = function(entry, content, onsuccess) {
  var blob = new Blob([content], {type: 'text/plain'});
  entry.createWriter(function(writer) {
    writer.onerror = util.handleFSError;
    writer.onwrite = util.writeToWriter_.bind(null, writer, blob, onsuccess);
    writer.truncate(blob.size);
  });
};

/**
 * @param {FileWriter} writer
 * @param {Blob} blob
 * @param {Function} onsuccess
 */
util.writeToWriter_ = function(writer, blob, onsuccess) {
  writer.onwrite = onsuccess;
  writer.write(blob);
};


$.historyApi = function() {
  this.useSearch_ = !!(window.history && history.pushState);
};

$.historyApi.prototype.getParams_ = function() {
  var params = {};
  var queryString = this.useSearch_ ?
      window.location.search : window.location.hash;
  if (queryString) {
    // split up the query string and store in an object
    var paramStrs = queryString.slice(1).split("&");
    for (var i = 0; i < paramStrs.length; i++) {
      var paramStr = paramStrs[i].split("=");
      params[paramStr[0]] = unescape(paramStr[1]);
    }
  }
  return params;
};

$.historyApi.prototype.param = function(key, opt_value) {
  var params = this.getParams_();
  if (opt_value != undefined) {
    params[key] = opt_value ? opt_value : undefined;
    if (this.useSearch_) {
      var newUrl = window.location.pathname + '?' + this.toString_(params);
      window.history.pushState({}, '', newUrl);
    } else {
      window.location.hash = this.toString_(params);
    }
  }
  return params[key];
};

$.historyApi.prototype.toString_ = function(params) {
  var paramStrings = [];
  $.each(params, function(key, value) {
    paramStrings.push(key + '=' + value);
  });
  return paramStrings.join('&');
};

$.history = new $.historyApi();
