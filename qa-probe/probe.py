"""Проба настоящего Safari на macOS-раннере: фактический viewport 360/375/390 и сбор ошибок.

Запуск в CI: python3 qa-probe/probe.py  (safaridriver уже включён, сервер поднимается здесь же).
Пишет qa-probe-report.json и печатает таблицу.
"""
import http.server
import json
import platform
import socketserver
import subprocess
import threading
import time
from pathlib import Path

from selenium import webdriver
from selenium.common.exceptions import WebDriverException

ROOT = Path(__file__).parent / "site"
PORT = 8765
HTTP_LOG = []  # каждый запрос, который увидел сервер: путь, статус
COLLECTOR = (ROOT / "collector.js").read_text()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, *a):
        pass

    def send_response(self, code, message=None):
        HTTP_LOG.append({"path": self.path, "status": code, "t": time.time()})
        super().send_response(code, message)

    def do_GET(self):
        if self.path.startswith("/api/fail"):
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"error":"probe"}')
            return
        path = self.path.split("?")[0]
        if path.endswith(".html") or path == "/":
            f = ROOT / ("index.html" if path == "/" else path.lstrip("/"))
            if f.exists():
                html = f.read_text()
                # сборщик встаёт первым элементом <head>, до любых скриптов страницы
                html = html.replace("<head>", "<head><script>" + COLLECTOR + "</script>", 1)
                body = html.encode()
                self.send_response(200)
                self.send_header("Content-Type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(body)))
                self.send_header("Cache-Control", "no-store")
                self.end_headers()
                self.wfile.write(body)
                return
        super().do_GET()


def serve():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), Handler) as s:
        s.serve_forever()


threading.Thread(target=serve, daemon=True).start()
time.sleep(0.5)

MEASURE = """return {
  innerWidth: window.innerWidth, outerWidth: window.outerWidth,
  clientWidth: document.documentElement.clientWidth,
  vvWidth: window.visualViewport ? window.visualViewport.width : null,
  vvScale: window.visualViewport ? window.visualViewport.scale : null,
  dpr: window.devicePixelRatio,
  scrollWidth: document.documentElement.scrollWidth,
  mq: [360,375,390].filter(w => matchMedia('(width: ' + w + 'px)').matches),
  ua: navigator.userAgent
};"""

report = {"os": platform.mac_ver()[0], "results": [], "log_api": {}}
sw = subprocess.run(["/usr/bin/defaults", "read", "/Applications/Safari.app/Contents/Info", "CFBundleShortVersionString"],
                    capture_output=True, text=True)
report["safari"] = sw.stdout.strip()

d = webdriver.Safari()
caps = d.capabilities
report["caps"] = {k: caps.get(k) for k in ("browserName", "browserVersion", "platformName")}
base = f"http://127.0.0.1:{PORT}/index.html"

# 1) Классический журнал WebDriver: есть ли он у safaridriver вообще
try:
    report["log_api"]["get_log_browser"] = len(d.get_log("browser"))
except Exception as e:  # ожидаем отказ: у safaridriver нет /log
    report["log_api"]["get_log_browser"] = "нет: " + type(e).__name__ + ": " + str(e).splitlines()[0][:160]

# 2) Подбор окна: выставляем внешнюю ширину так, чтобы innerWidth стал ровно целевым
for target in (360, 375, 390, 768, 1280):
    d.get("about:blank")
    d.set_window_rect(x=0, y=0, width=target, height=900)
    d.get(base + f"?w={target}")
    m = d.execute_script(MEASURE)
    first = dict(m)
    tries = 0
    while m["innerWidth"] != target and tries < 4:
        delta = target - m["innerWidth"]
        r = d.get_window_rect()
        d.set_window_rect(width=r["width"] + delta, height=900)
        time.sleep(0.3)
        m = d.execute_script(MEASURE)
        tries += 1
    rect = d.get_window_rect()
    time.sleep(1.5)  # дать отработать отложенным ошибкам страницы
    collected = d.execute_script("return window.__qa || null")
    report["results"].append({
        "target": target, "first": {k: first[k] for k in ("innerWidth", "outerWidth", "clientWidth")},
        "final": m, "window_rect": rect, "tries": tries,
        "exact": m["innerWidth"] == target and m["clientWidth"] == target and target in m["mq"] if target <= 390 else m["innerWidth"] == target,
        "collector": collected,
    })

d.quit()
report["http_log"] = HTTP_LOG
Path("qa-probe-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))

print("macOS", report["os"], "Safari", report["safari"], report["caps"])
print("get_log('browser'):", report["log_api"]["get_log_browser"])
for r in report["results"]:
    f = r["final"]
    c = r["collector"] or {}
    print(f"цель {r['target']}: innerWidth {f['innerWidth']} clientWidth {f['clientWidth']} vv {f['vvWidth']} "
          f"scale {f['vvScale']} mq {f['mq']} окно {r['window_rect']['width']} точно={r['exact']} "
          f"| сборщик: ok={c.get('installed')} console={len(c.get('console', []))} page={len(c.get('page', []))} "
          f"res={len(c.get('resource', []))} fetch={len(c.get('fetch', []))}")
print("HTTP >=400 по логу сервера:", [(h["path"], h["status"]) for h in HTTP_LOG if h["status"] >= 400][:12])
print(json.dumps(report["results"][0]["collector"], ensure_ascii=False)[:1500])
