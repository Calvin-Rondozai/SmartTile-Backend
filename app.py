from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from datetime import datetime
import requests

app = Flask(__name__)
app.config["SECRET_KEY"] = "your-secret-key-here"
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

# Store alert history in memory
alert_history: list[dict] = []
buzzer_active: bool = False

# Simple in-memory store of Expo push tokens
push_tokens: set[str] = set()
EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"


@app.route("/")
def index():
    return jsonify({"status": "SmartTile IoT Alert System API", "version": "1.0"})


@app.route("/api/push-token", methods=["POST"])
def register_push_token():
    """Register an Expo push token from the mobile app."""
    data = request.get_json(silent=True) or {}
    token = data.get("token")
    if not token:
        return jsonify({"status": "error", "message": "Missing token"}), 400

    push_tokens.add(token)
    return jsonify({"status": "ok", "count": len(push_tokens)}), 200


def send_push_notifications(alert: dict) -> None:
    """Send a push notification for an alert to all registered Expo tokens."""
    if not push_tokens:
        return

    title = f"SmartTile Alert - {alert.get('location', 'Unknown')}"
    body = f"{alert.get('type', 'Alert')} at {alert.get('location', 'Unknown')} – {alert.get('distance', '?')} cm"

    message = {
        "to": list(push_tokens),
        "title": title,
        "body": body,
        "sound": "default",
        "data": {"alert": alert},
    }

    try:
        resp = requests.post(EXPO_PUSH_URL, json=message, timeout=5)
        if resp.status_code >= 300:
            print(f"[PUSH] Failed: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"[PUSH] Error sending notification: {e}")


# Endpoint for ESP32 to send alerts
@app.route("/api/alert", methods=["POST"])
def receive_alert():
    try:
        data = request.get_json(silent=True) or {}
        alert = {
            "id": len(alert_history) + 1,
            "type": data.get("type", "Motion Detected"),
            # Accept both keys to be tolerant of ESP32 payload differences
            "sensor_reading": data.get("sensor_reading", data.get("sensor", "N/A")),
            "distance": data.get("distance", 0),
            "location": data.get("location", "Unknown"),
            "timestamp": datetime.now().isoformat(),
            "status": "active",
        }
        alert_history.append(alert)

        # Broadcast to all connected clients
        socketio.emit("new_alert", alert)
        # Send push notification to mobile devices (if tokens registered)
        send_push_notifications(alert)

        global buzzer_active
        buzzer_active = True

        return jsonify({"status": "success", "alert_id": alert["id"]}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 400


# Endpoint to turn off buzzer
@app.route("/api/buzzer/off", methods=["POST"])
def turn_off_buzzer():
    global buzzer_active
    buzzer_active = False

    # Broadcast to all clients
    socketio.emit("buzzer_off", {"timestamp": datetime.now().isoformat()})

    return jsonify({"status": "success", "buzzer": "off"}), 200


# Endpoint to get alert history
@app.route("/api/alerts/history", methods=["GET"])
def get_alert_history():
    limit = request.args.get("limit", 50, type=int)
    return jsonify({"alerts": alert_history[-limit:]}), 200


# Endpoint to get current buzzer status
@app.route("/api/buzzer/status", methods=["GET"])
def get_buzzer_status():
    return jsonify({"buzzer_active": buzzer_active}), 200


# SocketIO connection handlers
@socketio.on("connect")
def handle_connect():
    print(f"Client connected: {request.sid}")
    emit("connection_status", {"status": "connected", "buzzer_active": buzzer_active})
    # Send recent alerts to newly connected client
    if alert_history:
        emit("alert_history", {"alerts": alert_history[-10:]})


@socketio.on("disconnect")
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")


@socketio.on("request_history")
def handle_history_request():
    emit("alert_history", {"alerts": alert_history[-50:]})


if __name__ == "__main__":
    import eventlet
    import os

    print("Starting SmartTile IoT Alert System Server...")
    print("Server running on http://localhost:5000")

    # Run server with eventlet for production (Render compatible)
    port = int(os.environ.get("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port)
