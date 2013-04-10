/**
 * @constructor
 * @param {drive.Api} api The API to use to save files.
 * @param {number} id
 * @param {EditSession} session Ace edit session.
 * @param {string=} opt_fileId The file ID associated with this tab, if
 *     this tab is showing context that is already saved to Drive.
 * @param {drive.File} opt_fileId The file associated with this tab if it is
 *     available.
 */
function Tab(api, id, session, opt_fileId, opt_file) {
  this.api_ = api;
  this.id_ = id;
  this.session_ = session;
  this.state_ = Tab.State.SAVED;
  this.fileId_ = opt_fileId;
  this.file_ = opt_file
};

Tab.State = {
  SAVED: 'saved',
  SAVING: 'saving',
  UNSAVED: 'unsaved'
};

Tab.DEFAULT_MIMETYPE_ = 'text/plain';

Tab.prototype.getId = function() {
  return this.id_;
};

Tab.prototype.getName = function() {
  var defaultName = 'Untitled ' + this.id_;
  if (this.fileId_) {
    return this.file_ ? this.file_['title'] || defaultName : 'Loading...';
  } else {
    // File isnt save to Drive yet and doesnt have a name.
    return defaultName;
  }
};

/**
 * @return {string?} Filename extension or null.
 */
Tab.prototype.getExtension = function() {
  if (!this.file_)
    return null;

  if (this.file_['fileExtension']) {
    return this.file_['fileExtension'];
  }

  var match = /\.([^.\\\/]+)$/.exec(this.getName());
  return match ? match[1] : null;
};

Tab.prototype.getSession = function() {
  return this.session_;
};

/**
 * @param {File} file
 */
Tab.prototype.setFile = function(file, opt_ignoreContent) {
  var nameChanged = this.getName() != file['title'];
  this.fileId_ = file['id'];
  Tabs.addFileId(this.fileId_);
  this.file_ = file;
  if (nameChanged)
    $.event.trigger('tabrenamed', this);
  if (this.file_['content'] && !opt_ignoreContent) {
    this.session_.setValue(this.file_['content']);
    this.setState(Tab.State.SAVED);
  }
};

Tab.prototype.getFile = function() {
  return this.file_;
};

Tab.prototype.getContents = function() {
  return this.session_.getValue();
};

Tab.prototype.getFileId = function() {
  return this.fileId_;
};

/**
 * @param {number} tabSize
 */
Tab.prototype.setTabSize = function(tabSize) {
  this.session_.setTabSize(tabSize);
};

/**
 * @param {boolean} wrapLines
 */
Tab.prototype.setWrapping = function(wrapLines) {
  this.session_.setUseWrapMode(wrapLines);
};

Tab.prototype.save = function(opt_callbackDone) {
  this.setState(Tab.State.SAVING);
  if (this.fileId_) {
   var callback = function(file) {
      this.setState(Tab.State.SAVED);
      if (opt_callbackDone) {
        opt_callbackDone();
      }
    }.bind(this);
    this.api_.update(callback, this.file_, this.session_.getValue());
  } else {
    // TODO(eschoeffler): better prompt
    var title = window.prompt('Name this file before saving');
    var mimeType = 'text/plain';
    var callback = function(file) {
      this.setFile(file, true);
      this.setState(Tab.State.SAVED);
      if (opt_callbackDone) {
        opt_callbackDone();
      }
    }.bind(this);
    this.api_.insert(
        callback, title, Tab.DEFAULT_MIMETYPE_, this.session_.getValue());
  }
};

Tab.prototype.isSaved = function() {
  return this.state_ === Tab.State.SAVED;
};

Tab.prototype.getState = function() {
  return this.state_;
};

Tab.prototype.setState = function(state) {
  if (state != this.saved_) {
    this.state_ = state;
    $.event.trigger('tabchange', this);
  }
};

Tab.prototype.changed = function() {
  this.setState(Tab.State.UNSAVED);
};


/**
 * @constructor
 */
function Tabs(api, editor, dialogController, settings) {
  this.api_ = api;
  this.editor_ = editor;
  this.dialogController_ = dialogController;
  this.settings_ = settings;
  this.tabs_ = [];
  this.currentTab_ = null;
  this.nextTabId_ = 0;
  $(document).bind('docchange', this.onDocChanged_.bind(this));
  $(document).bind('settingschange', this.onSettingsChanged_.bind(this));
}

/**
 * @type {Object} params
 * @type {function(FileEntry)} callback
 * Open a file in the system file picker. The FileEntry is copied to be stored
 * in background page, so that it wasn't destroyed when the window is closed.
 */
Tabs.chooseEntry = function(params, callback) {
  // TODO(eschoeffler): how is this used?
};

Tabs.addFileId = function(fileId) {
  var filesString = $.history.param('f');
  var files = filesString ? filesString.split(',') : [];
  if ($.inArray(fileId, files) < 0 ) {
    files.push(fileId);
    $.history.param('f', files.join(','));
  }
};

Tabs.removeFileId = function(fileId) {
  var filesString = $.history.param('f');
  var files = filesString ? filesString.split(',') : [];
  var index = $.inArray(fileId, files);
  if (index >=0) {
    files.splice(index, 1);
    $.history.param('f', files.join(','));
  }
};

Tabs.prototype.getTabById = function(id) {
  for (var i = 0; i < this.tabs_.length; i++) {
    if (this.tabs_[i].getId() === id)
      return this.tabs_[i];
  }
  return null;
};

Tabs.prototype.getCurrentTab = function(id) {
  return this.currentTab_;
};

Tabs.prototype.newTab = function(opt_fileId, opt_file) {
  var session = this.editor_.newSession();

  var tab = new Tab(
      this.api_, this.nextTabId_++, session, opt_fileId, opt_file);
  // TODO(eschoeffler): What about other settings?
  tab.setTabSize(this.settings_.get('tabsize'));
  this.tabs_.push(tab);
  $.event.trigger('newtab', tab);
  this.showTab(tab.getId());
  if (opt_fileId) {
    Tabs.addFileId(opt_fileId);
    if (opt_file) {
      tab.setFile(opt_file);
    } else {
      this.api_.get(opt_fileId, function(file) {
        tab.setFile(file);
      }, true);
    }
  }
};

Tabs.prototype.nextTab = function() {
  for (var i = 0; i < this.tabs_.length; i++) {
    if (this.tabs_[i] === this.currentTab_) {
      var next = i + 1;
      if (next === this.tabs_.length)
        next = 0;
      if (next !== i)
        this.showTab(this.tabs_[next].getId());
      return;
    }
  }
};

Tabs.prototype.showTab = function(tabId) {
  var tab = this.getTabById(tabId)
  this.editor_.setSession(tab.getSession());
  this.currentTab_ = tab;
  $.event.trigger('switchtab', tab);
  this.editor_.focus();
};

Tabs.prototype.close = function(tabId) {
  for (var i = 0; i < this.tabs_.length; i++) {
    if (this.tabs_[i].getId() == tabId)
      break;
  }

  if (i >= this.tabs_.length) {
    console.error('Can\'t find tab', tabId);
    return;
  }

  var tab = this.tabs_[i];

  if (!tab.isSaved()) {
    if (this.settings_.get('autosave') && tab.getFileId()) {
      this.save(tab, true /* close */);
    } else {
      this.dialogController_.setText(
          'Do you want to save the file before closing?');
      this.dialogController_.resetButtons();
      this.dialogController_.addButton('yes', 'Yes');
      this.dialogController_.addButton('no', 'No');
      this.dialogController_.addButton('cancel', 'Cancel');
      this.dialogController_.show(function(answer) {
        if (answer === 'yes') {
          this.save(tab, true /* close */);
          return;
        }

        if (answer === 'no') {
          this.closeTab_(tab);
          return;
        }
      }.bind(this));
    }
  } else {
    this.closeTab_(tab);
  }
};

/**
 * @param {Tab} tab
 * Close tab without checking whether it needs to be saved. The safe version
 * (invoking auto-save and, if needed, SaveAs dialog) is Tabs.close().
 */
Tabs.prototype.closeTab_ = function(tab) {
  if (tab === this.currentTab_) {
    if (this.tabs_.length > 1) {
      this.nextTab();
    } else {
      // TODO(eschoeffler): handle closing last tab.
      alert('handle closing last tab');
    }
  }

  for (var i = 0; i < this.tabs_.length; i++) {
    if (this.tabs_[i] === tab)
      break;
  }

  this.tabs_.splice(i, 1);
  if (tab.getFileId()) {
    Tabs.removeFileId(tab.getFileId());
  }
  $.event.trigger('tabclosed', tab);
};

Tabs.prototype.closeCurrent = function() {
  this.close(this.currentTab_.getId());
};

Tabs.prototype.openFile = function() {
  this.api_.pickFile('Open a text file',
      ['text/plain'],
      function(ids) {
        $.each(ids, function(index, id) {
          this.openFileId(id);
        }.bind(this));
      }.bind(this));
};

Tabs.prototype.save = function(opt_tab, opt_close) {
  if (!opt_tab)
    opt_tab = this.currentTab_;
  var callback = null;
  if (opt_close)
      callback = this.closeTab_.bind(this, opt_tab);
  opt_tab.save(callback);
};


Tabs.prototype.saveAs = function(opt_tab) {
  if (!opt_tab)
    opt_tab = this.currentTab_;
  if (opt_tab.getFileId()) {
    // File already exists in Drive, make a copy
    // TODO(eschoeffler): make a better prompt.
    var title = window.prompt('Save file as');
    var contents = opt_tab.getContents();
    this.api_.insert(
      function(file) {
        file['content'] = contents;
        this.newTab(file['id'], file);
      }.bind(this),
      title,
      opt_tab.getFile()['mimeType'],
      contents);
  } else {
    opt_tab.save();
  }
};


/**
 * @return {Array.<Object>} Each element:
 *     {entry: <FileEntry>, contents: <string>}.
 */
Tabs.prototype.getFilesToSave = function() {
  var toSave = [];
  // TODO(eschoeffler): fix this
  for (i = 0; i < this.tabs_.length; i++) {
    if (!this.tabs_[i].isSaved() && this.tabs_[i].getEntry()) {
      toSave.push({'entry': this.tabs_[i].getEntry(),
                   'contents': this.tabs_[i].getContents()});
    }
  }

  return toSave;
};

Tabs.prototype.openFileId = function(fileId) {
  if (!fileId) {
    return;
  }

  for (var i = 0; i < this.tabs_.length; i++) {
    if (this.tabs_[i].getFileId() === fileId) {
      this.showTab(this.tabs_[i].getId());
      return;
    }
  }

  this.newTab(fileId);
};

Tabs.prototype.onDocChanged_ = function(e, session) {
  var tab = this.currentTab_;
  if (this.currentTab_.getSession() !== session) {
    console.warn('Something wrong. Current session should be',
                 this.currentTab_.getSession(),
                 ', but this session was changed:', session);
    for (var i = 0; i < this.tabs_; i++) {
      if (this.tabs_[i].getSession() === session) {
        tab = this.tabs_[i];
        break;
      }
    }

    if (tab === this.currentTab_) {
      console.error('Unkown tab changed.');
      return;
    }
  }

  tab.changed();
};

/**
 * @param {Event} e
 * @param {string} key
 * @param {*} value
 */
Tabs.prototype.onSettingsChanged_ = function(e, key, value) {
  var i;

  switch (key) {
    case 'tabsize':
      if (value === 0) {
        this.settings_.set('tabsize', 8);
        return;
      }
      for (i = 0; i < this.tabs_.length; i++) {
        this.tabs_[i].setTabSize(value);
      }
      break;

    case 'wraplines':
      for (i = 0; i < this.tabs_.length; i++) {
        this.tabs_[i].setWrapping(value);
      }
      break;
  }
};
