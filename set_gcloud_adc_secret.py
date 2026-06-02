import urllib.request
import json

token_path = "/home/scion/.scion/scion-token"
with open(token_path, 'r') as f:
    token = f.read().strip()

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def set_secret(key, payload):
    url = f"https://hub.demo.scion-ai.dev/api/v1/secrets/{key}"
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

print("Setting gcloud-adc secret on Hub...")
status, body = set_secret("gcloud-adc", payload)
print(status, body)
