import time
import urllib.request
import json

time.sleep(1)

url = "http://localhost:8000/analyze"
payload = {
    "text": "The contract between Acme Corp and Globex expires on December 31, 2026. The renewal fee is $10,000, and we must notify them 60 days prior if we wish to not renew."
}
data = json.dumps(payload).encode('utf-8')
headers = {'Content-Type': 'application/json'}

req = urllib.request.Request(url, data=data, headers=headers)
print("Sending request to /analyze...")
try:
    with urllib.request.urlopen(req) as resp:
        print(f"Status: {resp.status}")
        response_data = resp.read().decode('utf-8')
        print(json.dumps(json.loads(response_data), indent=2))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} - {e.read().decode('utf-8')}")
except Exception as e:
    print(f"Failed: {e}")
