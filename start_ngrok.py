"""
VisionaryX — Ngrok Tunnel for Public Access
Creates a public URL for the Flask-based VisionaryX app.
Run this AFTER starting server.py
"""
import subprocess
import time
import sys

try:
    from pyngrok import ngrok
except ImportError:
    print("[INFO] Installing pyngrok...")
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'pyngrok'])
    from pyngrok import ngrok

FLASK_PORT = 5000

def main():
    print("\n=== VisionaryX Public Link Generator ===\n")
    print(f"[INFO] Make sure server.py is running on port {FLASK_PORT}")
    print("[INFO] Starting ngrok tunnel...\n")

    try:
        # Open tunnel to Flask server
        tunnel = ngrok.connect(FLASK_PORT)
        public_url = tunnel.public_url

        print("=" * 50)
        print(f"  PUBLIC URL: {public_url}")
        print("=" * 50)
        print(f"\nShare this link to access VisionaryX from any device!")
        print("Works on mobile phones, tablets, and desktops.")
        print("\nPress Ctrl+C to stop the tunnel.\n")

        # Keep alive
        while True:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n[INFO] Shutting down tunnel...")
        ngrok.kill()
        print("[OK] Tunnel closed.")
    except Exception as e:
        print(f"[ERROR] {e}")
        print("\nTroubleshooting:")
        print("1. Make sure server.py is running first")
        print("2. Run: ngrok config add-authtoken YOUR_TOKEN")
        print("   Get token at: https://dashboard.ngrok.com/get-started/your-authtoken")

if __name__ == '__main__':
    main()
