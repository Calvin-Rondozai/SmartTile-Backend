"""
Test script to simulate ESP32 alerts for testing the dashboard
Run this script to send test alerts to the backend
"""

import requests
import time
import json

BACKEND_URL = "http://localhost:5000/api/alert"

def send_test_alert(distance=15):
    """Send a test alert to the backend"""
    payload = {
        "type": "Motion Detected",
        "sensor_reading": "Ultrasonic Sensor",
        "distance": distance
    }
    
    try:
        response = requests.post(BACKEND_URL, json=payload)
        if response.status_code == 200:
            print(f"✅ Alert sent successfully! Distance: {distance}cm")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Error: {response.status_code} - {response.text}")
    except requests.exceptions.ConnectionError:
        print("❌ Error: Could not connect to backend. Make sure the server is running on http://localhost:5000")
    except Exception as e:
        print(f"❌ Error: {e}")

def main():
    print("🧪 SmartTile Alert Tester")
    print("=" * 40)
    print("This script simulates ESP32 alerts for testing")
    print("Make sure the backend server is running!")
    print("=" * 40)
    print()
    
    while True:
        try:
            distance = input("Enter distance (cm) or 'q' to quit: ").strip()
            
            if distance.lower() == 'q':
                print("👋 Goodbye!")
                break
            
            try:
                distance = int(distance)
                if distance > 0 and distance <= 100:
                    send_test_alert(distance)
                else:
                    print("⚠️  Distance should be between 1 and 100 cm")
            except ValueError:
                print("⚠️  Please enter a valid number")
            
            print()
            
        except KeyboardInterrupt:
            print("\n👋 Goodbye!")
            break

if __name__ == "__main__":
    main()
