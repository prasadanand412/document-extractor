import requests

url = "http://localhost:8000/analyze"
print("Testing upload format...")
with open("requirements.txt", "rb") as f:
    files = {"file": ("requirements.txt", f, "text/plain")}
    resp = requests.post(url, files=files)
    print(resp.status_code)
    try:
        print(resp.json())
    except:
        print(resp.text)
