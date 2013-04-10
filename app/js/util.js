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

$.historyApi.prototype.init_ = function() {
  var hashParams = this.getParams_(false);
  var queryParams = this.getParams_(true);
  if (this.useSearch_) {
    $.each(hashParams, function(key, value) {
      if (!queryParams[key]) {
        this.param(key, value);
      }
    }.bind(this));
    window.location.hash = '';
  } else {
    $.each(queryParams, function(key, value) {
      if (!hashParams[key]) {
        this.param(key, value);
      }
    }.bind(this));
  }
};

$.historyApi.prototype.getParams_ = function(useSearch) {
  var params = {};
  var queryString = useSearch ?
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
  var params = this.getParams_(this.useSearch_);
  if (typeof opt_value === 'undefined') {
    return params[key];
  }
  if (!opt_value) {
    delete params[key];
  } else {
    params[key] = opt_value;
  }
	if (this.useSearch_) {
		var newUrl = window.location.pathname + '?' + this.toString_(params);
		window.history.pushState({}, '', newUrl);
	} else {
		window.location.hash = this.toString_(params);
	}
  return params[key];
};

$.historyApi.prototype.toString_ = function(params) {
  var paramStrings = [];
  $.each(params, function(key, value) {
    if (key && value) {
      paramStrings.push(key + '=' + value);
    }
  });
  return paramStrings.join('&');
};

$.history = new $.historyApi();
$.history.init_();