(function () {
  function sanitizeFolderName(name) {
    var withoutExtension = String(name || 'Untitled').trim().replace(/\.prproj$/i, '');
    var cleaned = withoutExtension
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '');
    return cleaned || 'Untitled';
  }

  function reviewDateStamp(date) {
    var d = date || new Date();
    return String(d.getFullYear()) + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  }

  function nextReviewFolderName(options) {
    var base = sanitizeFolderName(options.projectName) + '_Review_' + reviewDateStamp(options.date || new Date());
    var nextVersion = 1;
    var prefix = base + '_V';
    var existingNames = options.existingNames || [];
    for (var i = 0; i < existingNames.length; i += 1) {
      var value = String(existingNames[i]);
      if (value.indexOf(prefix) !== 0) continue;
      var version = Number(value.slice(prefix.length));
      if (isFinite(version)) nextVersion = Math.max(nextVersion, version + 1);
    }
    return base + '_V' + nextVersion;
  }

  window.ReviewExportPath = {
    sanitizeFolderName: sanitizeFolderName,
    reviewDateStamp: reviewDateStamp,
    nextReviewFolderName: nextReviewFolderName
  };
}());
