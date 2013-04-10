/**
 * @constructor
 */
function TextDrive() {
  this.editor_ = null;
  this.settings_ = null;
  this.tabs_ = null;

  this.dialogController_ = null;
  this.hotkeysController_ = null;
  this.menuController_ = null;
  this.searchController_ = null;
  this.settingsController_ = null;
  this.windowController_ = null;

  this.hasFrame_ = false;
}

/**
 * Called when all the resources have loaded. All initializations should be done
 * here.
 */
TextDrive.prototype.init = function() {
  this.dialogController_ = new DialogController($('#dialog-container'))

  this.api_ = new drive.Api(
      '511145861127.apps.googleusercontent.com', // TextDrive
      ['https://www.googleapis.com/auth/drive'],
      $.history.param('u'));
  this.settings_ = new Settings();
  this.editor_ = new Editor('editor', this.settings_);
  this.tabs_ = new Tabs(
      this.api_, this.editor_, this.dialogController_, this.settings_);

  this.hotkeysController_ = new HotkeysController(this.tabs_, this.editor_);
  this.menuController_ = new MenuController(this.tabs_);
  this.searchController_ = new SearchController(this.editor_);
  this.settingsController_ = new SettingsController(this.settings_);
  this.windowController_ = new WindowController(this.editor_);
  
  this.started_ = false;
  this.api_.on('requirespopup', this.requiresPopup_.bind(this));
  this.api_.on('authed', this.onAuth_.bind(this));
  this.api_.on('userId', this.onUserIdAvailable_.bind(this));
  this.api_.on('error', this.onApiError_.bind(this));
  this.api_.start();
};


/**
 * Handles when the current user id is available.
 */
TextDrive.prototype.onUserIdAvailable_ = function(e, userId) {
  $.history.param('u', userId);
};


/**
 * Handles a error from the API.
 */
TextDrive.prototype.onApiError_ = function(e, code, message) {
  var errorMessage = 'Error ' + code + ': ' + message;
  this.dialogController_.setText(errorMessage);
  this.dialogController_.resetButtons();
  this.dialogController_.addButton('ok', 'Ok');
  this.dialogController_.show(function() {});
};


/**
 * Handles a successful authorization.
 */
TextDrive.prototype.requiresPopup_ = function() {
  this.dialogController_.setText('Authorization is required');
  this.dialogController_.resetButtons();
  this.dialogController_.addButton('ok', 'Ok');
  this.dialogController_.show(this.api_.authorize.bind(this.api_, true));
};


/**
 * Handles a successful authorization.
 */
TextDrive.prototype.onAuth_ = function() {
  if (this.started_) { return; };
  this.started_ = true;
  this.initializeFiles_();
};


/**
 * Initializes the files by loading all files indicated by the URL.
 * If there are no files in the URL, open a new file
 */
TextDrive.prototype.initializeFiles_ = function() {
  var filesString = $.history.param('f');
  if (filesString) {
    var files = filesString.split(',');
    $.each(files, function(index, id) {
      this.tabs_.openFileId(id);
    }.bind(this));
  } else {
    this.openNew();
  }
};

TextDrive.prototype.openNew = function() {
  this.tabs_.newTab();
};

TextDrive.prototype.setHasChromeFrame = function(hasFrame) {
  this.hasFrame_ = hasFrame;
  this.windowController_.windowControlsVisible(!hasFrame);
};

/**
 * @return {Array.<Object>} Each element:
 *     {entry: <FileEntry>, contents: <string>}.
 */
TextDrive.prototype.getFilesToSave = function() {
  if (this.settings_.get('autosave')) {
    return this.tabs_.getFilesToSave();
  } else {
    return [];
  }
};

var textDrive = new TextDrive();

$(document).ready(textDrive.init.bind(textDrive));
