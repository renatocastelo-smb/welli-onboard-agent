"""
Flask API server for the market intelligence dashboard.
Run: python dashboard/server.py
Opens on http://localhost:5050
"""

import sys
import os
import json
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory

sys.path.insert(0, str(Path(__file__).parent.parent))
import db

app = Flask(__name__, static_folder=str(Path(__file__).parent))


@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/api/events")
def api_events():
    limit = min(int(request.args.get("limit", 100)), 500)
    event_type = request.args.get("type") or None
    category = request.args.get("category") or None
    events = db.get_events_with_vendors(
        limit=limit, event_type=event_type, category_filter=category
    )
    return jsonify(events)


@app.route("/api/vendors")
def api_vendors():
    with db.get_conn() as conn:
        rows = conn.execute(
            "SELECT id, handle, name, category, platform, active, notes "
            "FROM vendors ORDER BY category, name"
        ).fetchall()
    return jsonify([dict(r) for r in rows])


@app.route("/api/network")
def api_network():
    min_co = int(request.args.get("min", 2))
    pairs = db.get_vendor_network(min_cooccurrences=min_co)
    return jsonify(pairs)


@app.route("/api/stats")
def api_stats():
    stats = db.get_stats()
    last_run_file = Path(__file__).parent.parent / "last_run.json"
    if last_run_file.exists():
        stats["last_run"] = json.loads(last_run_file.read_text())
    return jsonify(stats)


@app.route("/api/calendar")
def api_calendar():
    """Return event counts grouped by week for the heatmap."""
    with db.get_conn() as conn:
        rows = conn.execute("""
            SELECT strftime('%Y-W%W', event_date) AS week,
                   event_type,
                   COUNT(*) AS cnt
            FROM events
            WHERE event_date IS NOT NULL
            GROUP BY week, event_type
            ORDER BY week DESC
            LIMIT 200
        """).fetchall()
    return jsonify([dict(r) for r in rows])


if __name__ == "__main__":
    db.init_db()
    port = int(os.getenv("PORT", 5050))
    print(f"Dashboard running at http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=True)
