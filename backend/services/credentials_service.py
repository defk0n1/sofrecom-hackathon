# google_config.py
import os, json
from dotenv import load_dotenv
load_dotenv()

def get_json_env_or_file(env_name, file_name):
    val = os.getenv(env_name)
    if val:
        data = json.loads(val)
        # Dump to file when using environment variable
        with open(file_name, 'w') as f:
            json.dump(data, f, indent=2)
        return data
    with open(file_name, 'r') as f:
        return json.load(f)

google_credentials = get_json_env_or_file('GOOGLE_CREDENTIALS', 'credentials.json')
google_token = get_json_env_or_file('GOOGLE_TOKEN', 'token.json')