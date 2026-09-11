# -*- coding: utf-8 -*-
"""Atajo para arrancar el servidor local de SAST Web API."""
import os
from api.index import app

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print("=" * 60)
    print("  🛡️   SAST STUDIO · Backend API")
    print("=" * 60)
    print(f"  Health : http://localhost:{port}/api/health")
    print(f"  Scan   : http://localhost:{port}/api/scan (POST)")
    print(f"  Rules  : http://localhost:{port}/api/rules")
    print("=" * 60)
    app.run(host="0.0.0.0", port=port, debug=True, threaded=True)
