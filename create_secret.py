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

def make_request(url, method="POST", data=None):
    req = urllib.request.Request(
        url, 
        headers=headers, 
        method=method,
        data=json.dumps(data).encode('utf-8') if data is not None else None
    )
    try:
        with urllib.request.urlopen(req) as response:
            return response.status, response.read().decode('utf-8')
    except Exception as e:
        # If there's an HTTPError, try to read the response body for details
        if hasattr(e, 'read'):
            return e.code, e.read().decode('utf-8')
        return 500, str(e)

project_id = "4d85d2ba-33f4-481c-9397-0035fe8ede30"
url = f"https://hub.demo.scion-ai.dev/api/v1/projects/{project_id}/secrets"

# Payload structure 1
payload1 = {
    "key": "gcloud-adc",
    "value": "{}",
    "type": "file"
}
print("Trying payload 1...")
status, body = make_request(url, method="POST", data=payload1)
print(status, body)

# Payload structure 2 (maybe it requires "target" or other fields?)
payload2 = {
    "key": "gcloud-adc",
    "value": "{}",
    "type": "file",
    "target": "/home/scion/.config/gcloud/application_default_credentials.json",
    "injectionMode": "as_needed"
}
print("Trying payload 2...")
status, body = make_request(url, method="POST", data=payload2)
print(status, body)
