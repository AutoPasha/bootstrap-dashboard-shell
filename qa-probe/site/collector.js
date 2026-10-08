(function () {
  var qa = (window.__qa = { installed: true, t0: Date.now(), console: [], page: [], resource: [], fetch: [] });
  var origError = console.error;
  console.error = function () {
    try { qa.console.push(Array.prototype.map.call(arguments, String).join(" ")); } catch (e) {}
    return origError.apply(console, arguments);
  };
  window.addEventListener("error", function (e) {
    var t = e.target;
    if (t && t !== window && (t.src || t.href)) qa.resource.push((t.tagName || "") + " " + (t.src || t.href));
    else qa.page.push((e.message || "error") + " @" + (e.filename || "") + ":" + (e.lineno || 0));
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    qa.page.push("unhandledrejection: " + (e.reason && e.reason.message ? e.reason.message : String(e.reason)));
  });
  var f = window.fetch;
  window.fetch = function (u) {
    return f.apply(this, arguments).then(function (r) {
      if (!r.ok) qa.fetch.push(r.status + " " + r.url);
      return r;
    }, function (err) { qa.fetch.push("network " + String(u) + " " + err); throw err; });
  };
})();
