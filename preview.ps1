# Local preview — no build tools needed, just a static file server.
# Serves the site at http://localhost:8000
#
# Usage:  .\preview.ps1
# Stop:   Ctrl+C

Write-Host 'Serving http://localhost:8000 — open in your browser.' -ForegroundColor Cyan
python -m http.server 8000 --bind 127.0.0.1