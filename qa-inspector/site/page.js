// Внешний скрипт разрешён CSP: даёт одну ошибку через console API и одну ошибку CORS
var scr = location.pathname.replace(/.*screen-|\.html/g, "");
console.error("probe console.error, экран " + scr);
fetch("http://127.0.0.1:8766/data?screen=" + scr).catch(function () {});
