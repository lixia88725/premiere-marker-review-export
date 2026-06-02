(function () {
  if (window.CSInterface) return;
  window.SystemPath = { EXTENSION: 'extension' };
  window.CSInterface = function CSInterface() {};
  window.CSInterface.prototype.evalScript = function evalScript(script, callback) {
    if (window.__adobe_cep__ && window.__adobe_cep__.evalScript) {
      window.__adobe_cep__.evalScript(script, callback || function () {});
      return;
    }
    if (callback) callback(JSON.stringify({ ok: false, error: 'CEP evalScript bridge is not available.' }));
  };
  window.CSInterface.prototype.getSystemPath = function getSystemPath(pathType) {
    if (window.__adobe_cep__ && window.__adobe_cep__.getSystemPath) {
      return window.__adobe_cep__.getSystemPath(pathType);
    }
    return window.location.pathname.replace(/\/[^/]*$/, '');
  };
}());
