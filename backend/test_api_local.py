import requests

with open('requirements.txt', 'rb') as f:
    response = requests.post('http://127.0.0.1:8000/analyze', files={'file': ('requirements.txt', f, 'text/plain')})
print(response.status_code)
print(response.text)
