from __future__ import annotations

import argparse
import http.server
import socket
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
SHARE_ROOT = REPO_ROOT / "publish" / "brand-kit"


def local_ip() -> str:
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        sock.connect(("10.255.255.255", 1))
        return sock.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        sock.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Share the WingsGroup brand kit over a local network.")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8765)
    args = parser.parse_args()
    if not SHARE_ROOT.exists():
        raise SystemExit("Brand kit not found. Run: python scripts/build-brand-kit.py")

    handler = lambda *handler_args, **handler_kwargs: http.server.SimpleHTTPRequestHandler(
        *handler_args, directory=str(SHARE_ROOT), **handler_kwargs
    )
    server = http.server.ThreadingHTTPServer((args.host, args.port), handler)
    print(f"Local: http://127.0.0.1:{args.port}/")
    print(f"LAN:   http://{local_ip()}:{args.port}/")
    print("Press Ctrl+C to stop sharing.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
