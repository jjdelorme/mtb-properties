import urllib.request
import json
import os

token_path = "/home/scion/.scion/scion-token"
with open(token_path, 'r') as f:
    token = f.read().strip()

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

def make_request(url, method="GET", data=None):
    req = urllib.request.Request(
        url, 
        headers=headers, 
        method=method,
        data=json.dumps(data).encode('utf-8') if data else None
    )
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, response.read().decode('utf-8')
    except Exception as e:
        return 500, str(e)

# Test whoami
print("Testing whoami...")
status, body = make_request("https://hub.demo.scion-ai.dev/api/v1/whoami")
print(status, body)

# Test secrets listing or info
project_id = "4d85d2ba-33f4-481c-9397-0035fe8ede30"
print(f"Testing secrets list for project {project_id}...")
status, body = make_request(f"https://hub.demo.scion-ai.dev/api/v1/projects/{project_id}/secrets")
print(status, body)
