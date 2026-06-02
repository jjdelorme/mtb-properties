import urllib.request
import json

token_path = "/home/scion/.scion/scion-token"
with open(token_path, 'r') as f:
    token = f.read().strip()

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

project_id = "4d85d2ba-33f4-481c-9397-0035fe8ede30"

def try_put(url, payload):
    req = urllib.request.Request(
        url, 
        headers=headers, 
        method="PUT",
        data=json.dumps(payload).encode('utf-8')
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read().decode('utf-8')
    except Exception as e:
        if hasattr(e, 'read'):
            return e.code, e.read().decode('utf-8')
        return 500, str(e)

payload = {
    "type": "file",
    "target": "/workspace/dummy-adc.json",
    "value": "{}",
}

url = f"https://hub.demo.scion-ai.dev/api/v1/projects/{project_id}/secrets/gcloud-adc"
print(f"Testing PUT {url}...")
status, body = try_put(url, payload)
print(status, body)
