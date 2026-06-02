import urllib.request
import json

token_path = "/home/scion/.scion/scion-token"
with open(token_path, 'r') as f:
    token = f.read().strip()

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def make_post(url, payload):
    req = urllib.request.Request(
        url, 
        headers=headers, 
        method="POST",
        data=json.dumps(payload).encode('utf-8')
    )
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, r.read().decode('utf-8')
    except Exception as e:
        if hasattr(e, 'read'):
            return e.code, e.read().decode('utf-8')
        return 500, str(e)

grove_id = "4d85d2ba-33f4-481c-9397-0035fe8ede30"
url = f"https://hub.demo.scion-ai.dev/api/v1/projects/{grove_id}/agents"

# Try passing service_account_id on agent create
payload = {
    "name": "architect",
    "template": "architect",
    "service_account_id": "9f4c401d-a18b-49ce-87c1-5848b267d057",
    "metadata_mode": "assign",
    "prompt": "Hello",
    "task": "Hello"
}

print(f"POSTing to {url}...")
status, body = make_post(url, payload)
print(status, body)
