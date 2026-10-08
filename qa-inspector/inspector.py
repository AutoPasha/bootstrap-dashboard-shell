"""Проба консоли Web Inspector в настоящем Safari на macOS-раннере.

Зачем: сообщения движка (CSP, CORS, ресурс 404) не проходят через console API,
сборщик в <head> их не видит. Их показывает только консоль Web Inspector.
Проба проверяет, что консоль открывается и снимается по экранам, двумя путями:
  B — обычное окно Safari (open -a Safari), консоль по Cmd+Opt+C;
  A — окно сессии safaridriver, то же сочетание.
Пишет qa-inspector/out/report.json и снимки out/<путь>-<экран>.png.
"""
import http.server
import json
import platform
import socketserver
import subprocess
import threading
import time
from pathlib import Path

ROOT = Path(__file__).parent / "site"
OUT = Path(__file__).parent / "out"
OUT.mkdir(exist_ok=True)
PORT, OTHER = 8765, 8766
SCREENS = ["a", "b", "c"]
report = {"os": platform.mac_ver()[0], "steps": []}


def step(name, cmd, timeout=40):
    try:
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        # чаще всего висит системный запрос разрешения: снимок покажет, какой
        r = subprocess.CompletedProcess(cmd, 124, "", f"завис дольше {timeout} с")
    rec = {"step": name, "rc": r.returncode,
           "out": r.stdout.strip()[:600], "err": r.stderr.strip()[:600]}
    report["steps"].append(rec)
    print(f"[{r.returncode}] {name}: {rec['out'][:200]} {rec['err'][:200]}", flush=True)
    return r


def osa(name, script, timeout=20):
    return step(name, ["osascript", "-e", script], timeout)


class Main(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    def log_message(self, *a):
        pass

    def end_headers(self):
        # CSP: только свои скрипты, встроенный блок в странице будет отклонён движком
        self.send_header("Content-Security-Policy", "script-src 'self'")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


class Other(http.server.BaseHTTPRequestHandler):
    # Другой источник без Access-Control-Allow-Origin: fetch с главной упадёт по CORS
    def log_message(self, *a):
        pass

    def do_GET(self):
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(b'{"ok":true}')


def serve(port, handler):
    socketserver.ThreadingTCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", port), handler) as s:
        s.serve_forever()


threading.Thread(target=serve, args=(PORT, Main), daemon=True).start()
threading.Thread(target=serve, args=(OTHER, Other), daemon=True).start()
time.sleep(1)


def url(screen):
    return f"http://127.0.0.1:{PORT}/screen-{screen}.html"


def shot(path, screen):
    f = OUT / f"{path}-{screen}.png"
    step(f"снимок {f.name}", ["screencapture", "-x", str(f)])
    report.setdefault("shots", []).append(f.name if f.exists() else f"нет {f.name}")


def open_console(path):
    r = osa(f"{path}: Cmd+Opt+C",
            'tell application "System Events" to keystroke "c" using {command down, option down}')
    time.sleep(3)
    return r.returncode == 0


report["safari"] = step("версия Safari", ["defaults", "read",
                        "/Applications/Safari.app/Contents/Info", "CFBundleShortVersionString"]).stdout.strip()

# Меню «Разработка»: обычный домен и домен песочницы Safari
for dom in ["com.apple.Safari",
            str(Path.home() / "Library/Containers/com.apple.Safari/Data/Library/Preferences/com.apple.Safari")]:
    for key in ["IncludeDevelopMenu", "WebKitDeveloperExtrasEnabledPreferenceKey",
                "com.apple.Safari.ContentPageGroupIdentifier.WebKit2DeveloperExtrasEnabled"]:
        step(f"defaults {key}", ["defaults", "write", dom, key, "-bool", "true"])

# Safari 17+ берёт меню «Разработка» из домена SandboxBroker
step("defaults SandboxBroker ShowDevelopMenu", ["defaults", "write", "com.apple.Safari.SandboxBroker", "ShowDevelopMenu", "-bool", "true"])
step("проверка SandboxBroker", ["defaults", "read", "com.apple.Safari.SandboxBroker"])

# Путь B: обычное окно Safari, без Apple Events к самому Safari (запрос разрешения там висит)
step("B: open -a Safari", ["open", "-a", "Safari", url("a")])
time.sleep(8)
shot("B0", "start")
osa("B: размер окна", 'tell application "System Events" to tell process "Safari" to set {position, size} of front window to {{0, 25}, {1280, 875}}')
osa("B: меню Safari", 'tell application "System Events" to tell process "Safari" to get name of menus of menu bar 1')
r = osa("B: пункты Develop", 'tell application "System Events" to tell process "Safari" to get name of menu items of menu "Develop" of menu bar 1')
if r.returncode:
    # Запасной путь: Настройки → Дополнения → «Показывать функции для веб-разработчиков»
    osa("B: Cmd+,", 'tell application "System Events" to keystroke "," using {command down}')
    time.sleep(3)
    osa("B: вкладки настроек", 'tell application "System Events" to tell process "Safari" to get name of buttons of toolbar 1 of window 1')
    osa("B: вкладка Advanced", 'tell application "System Events" to tell process "Safari" to click button "Advanced" of toolbar 1 of window 1')
    time.sleep(2)
    osa("B: флажки Advanced", 'tell application "System Events" to tell process "Safari" to get name of checkboxes of group 1 of group 1 of window 1')
    osa("B: включить разработку", 'tell application "System Events" to tell process "Safari" to click (first checkbox of group 1 of group 1 of window 1 whose name contains "web developers")')
    time.sleep(1)
    shot("B1", "settings")
    osa("B: закрыть настройки", 'tell application "System Events" to keystroke "w" using {command down}')
    time.sleep(1)
    osa("B: пункты Develop 2", 'tell application "System Events" to tell process "Safari" to get name of menu items of menu "Develop" of menu bar 1')
for s in SCREENS:
    if s != "a":
        step(f"B: переход {s}", ["open", "-a", "Safari", url(s)])
        time.sleep(5)
    report[f"B_console_{s}"] = open_console("B")
    shot("B", s)
step("B: закрыть Safari", ["pkill", "-x", "Safari"])
time.sleep(3)

# Путь A: окно сессии safaridriver. Прогон 37764147524: Cmd+Opt+C в окне автоматизации
# повесил сессию (ReadTimeout 120 с), включается только по PROBE_A=1
import os
try:
    if os.environ.get("PROBE_A") != "1":
        raise RuntimeError("путь A пропущен")
    from selenium import webdriver
    d = webdriver.Safari()
    d.set_window_rect(x=0, y=25, width=1280, height=875)
    d.get(url("a"))
    time.sleep(3)
    for s in SCREENS:
        if s != "a":
            d.get(url(s))
            time.sleep(4)
        report[f"A_console_{s}"] = open_console("A")
        shot("A", s)
    d.quit()
except Exception as e:  # noqa: BLE001
    report["A_error"] = f"{type(e).__name__}: {str(e).splitlines()[0][:300]}"
    print("A:", report["A_error"], flush=True)

(OUT / "report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps({k: v for k, v in report.items() if k != "steps"}, ensure_ascii=False, indent=2))
