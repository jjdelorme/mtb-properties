import urllib.request
import json

token_path = "/home/scion/.scion/scion-token"
with open(token_path, 'r') as f:
    token = f.read().strip()

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def try_request(url, method, payload):
    req = urllib.request.Request(
        url, 
        headers=headers, 
        method=method,
        data=json.dumps(payload).encode('utf-8') if payload is not None else None
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read().decode('utf-8')
    except Exception as e:
        if hasattr(e, 'read'):
            return e.code, e.read().decode('utf-8')
        return 500, str(e)

endpoints = [
    ("https://hub.demo.scion-ai.dev/api/v1/secrets", "POST", {"key": "gcloud-adc", "value": "{}", "type": "file"}),
    ("https://hub.demo.scion-ai.dev/api/v1/secrets", "PUT", {"key": "gcloud-adc", "value": "{}", "type": "file"}),
    ("https://hub.demo.scion-ai.dev/api/v1/secrets/gcloud-adc", "PUT", {"value": "{}", "type": "file"}),
    ("https://hub.demo.scion-ai.dev/api/v1/secrets/gcloud-adc", "POST", {"value": "{}", "type": "file"}),
]

for url, method, payload in endpoints:
    print(f"Testing {method} {url}...")
    status, body = try_request(url, method, payload)
    print(status, body)
