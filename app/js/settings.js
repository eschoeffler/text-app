/**
 * @constructor
 */
function Settings() {
  this.ready_ = false;
  this.settings_ = {};
  for (var key in Settings.SETTINGS) {
    this.settings_[key] = Settings.SETTINGS[key]['default'];
  }
}

/**
 * @type {string}
 * 'sync' or 'local'.
 */
Settings.AREA = 'sync';

/**
 * @type {Object.<string, Object>}
 */
Settings.SETTINGS = {
  'autosave': {'default': false, 'type': 'boolean', 'widget': 'checkbox'},
  // 'fontsize' currently is not shown in Settings tab, only changed with
  // Ctrl-+ / Ctrl--
  'fontsize': {'default': 14, 'type': 'number', 'widget': null},
  'linenumbers': {'default': true, 'type': 'boolean', 'widget': 'checkbox'},
  'margin': {'default': false, 'type': 'boolean', 'widget': 'checkbox'},
  'margincol': {'default': 80, 'type': 'integer', 'widget': 'number'},
  'tabsize': {'default': 2, 'type': 'integer', 'widget': 'number'},
  'wraplines': {'default': true, 'type': 'boolean', 'widget': 'checkbox'}
};

/**
 * @param {string} key Setting name.
 * @return {Object}
 */
Settings.prototype.get = function(key) {
  return this.settings_[key];
};

Settings.prototype.getAll = function() {
  return this.settings_;
};

Settings.prototype.set = function(key, value) {
  this.settings_[key] = value;
  this.onChanged_({key: value});
};

Settings.prototype.isReady = function() {
  return this.ready_;
};

Settings.prototype.getSettingsCallback_ = function(settings) {
  this.ready_ = true;
  for (var key in settings) {
    var value = settings[key];
    key = key.substring(9);
    this.settings_[key] = value;
  }
  $.event.trigger('settingsready');
};

Settings.prototype.onChanged_ = function(changes) {
  for (var key in changes) {
    var value = changes[key].newValue;
    console.log('Settings changed:', key, value);
    $.event.trigger('settingschange', [key, value]);
  }
};

