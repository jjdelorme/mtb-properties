import json
import subprocess

def test_start_config(config_dict):
    config_str = json.dumps(config_dict)
    cmd = [
        "scion", "start", "architect", "Test",
        "--config", "-",
        "--non-interactive"
    ]
    p = subprocess.Popen(cmd, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    out, err = p.communicate(input=config_str)
    return p.returncode, out, err

# Let's test with different combinations
configs = [
    {
        "metadata_mode": "assign",
        "service_account_id": "eventssample-sa@jasondel-cloudrun10.iam.gserviceaccount.com"
    },
    {
        "metadata_mode": "assign",
        "service_account": "eventssample-sa@jasondel-cloudrun10.iam.gserviceaccount.com"
    },
    {
        "metadata_mode": "assign",
        "sa_email": "eventssample-sa@jasondel-cloudrun10.iam.gserviceaccount.com"
    }
]

for idx, cfg in enumerate(configs):
    print(f"Testing config combination {idx+1}: {cfg}")
    code, out, err = test_start_config(cfg)
    print(f"Exit Code: {code}")
    print(f"Stdout:\n{out}")
    print(f"Stderr:\n{err}")
    print("-" * 50)
