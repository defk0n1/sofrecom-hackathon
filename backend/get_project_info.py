"""
Helper script to get your Google Cloud Project ID and setup information
Run this to get the exact values you need for Gmail Push Notifications
"""
import json
import os

def get_project_info():
    """Extract project information from credentials.json"""
    
    print("=" * 70)
    print("Gmail Push Notifications - Project Information")
    print("=" * 70)
    print()
    
    # Check for credentials.json
    if not os.path.exists('credentials.json'):
        print("❌ ERROR: credentials.json not found!")
        print()
        print("Please download credentials.json from:")
        print("https://console.cloud.google.com/apis/credentials")
        print()
        return
    
    try:
        with open('credentials.json', 'r') as f:
            creds = json.load(f)
        
        # Extract project info
        if 'installed' in creds:
            project_id = creds['installed'].get('project_id', 'NOT_FOUND')
            client_id = creds['installed'].get('client_id', 'NOT_FOUND')
        elif 'web' in creds:
            project_id = creds['web'].get('project_id', 'NOT_FOUND')
            client_id = creds['web'].get('client_id', 'NOT_FOUND')
        else:
            print("❌ ERROR: Unrecognized credentials.json format")
            return
        
        print("✅ Found your project information!")
        print()
        print("-" * 70)
        print("📋 YOUR CONFIGURATION VALUES:")
        print("-" * 70)
        print()
        print(f"Project ID: {project_id}")
        print()
        print(f"Full Topic Name:")
        print(f"  projects/{project_id}/topics/gmail-notifications")
        print()
        print(f"Webhook URL (replace YOUR_DOMAIN):")
        print(f"  https://YOUR_DOMAIN/pubsub/webhook")
        print()
        print("-" * 70)
        print("📝 COMMANDS TO RUN:")
        print("-" * 70)
        print()
        print("Start watching Gmail:")
        print(f"""
curl -X POST http://localhost:5000/pubsub/watch \\
  -H "Content-Type: application/json" \\
  -d '{{"topic_name": "projects/{project_id}/topics/gmail-notifications"}}'
""")
        print()
        print("-" * 70)
        print("🔗 USEFUL LINKS:")
        print("-" * 70)
        print()
        print(f"Google Cloud Console:")
        print(f"  https://console.cloud.google.com/?project={project_id}")
        print()
        print(f"Enable Pub/Sub API:")
        print(f"  https://console.cloud.google.com/apis/library/pubsub.googleapis.com?project={project_id}")
        print()
        print(f"Create Topic:")
        print(f"  https://console.cloud.google.com/cloudpubsub/topic/list?project={project_id}")
        print()
        print(f"Create Subscription:")
        print(f"  https://console.cloud.google.com/cloudpubsub/subscription/list?project={project_id}")
        print()
        print(f"IAM & Permissions:")
        print(f"  https://console.cloud.google.com/iam-admin/iam?project={project_id}")
        print()
        print("=" * 70)
        print("Next Steps:")
        print("  1. Follow the setup guide in GMAIL_PUSH_NOTIFICATIONS_SETUP.md")
        print("  2. Or use the quick start: GMAIL_PUSH_QUICK_START.md")
        print("=" * 70)
        print()
        
    except json.JSONDecodeError:
        print("❌ ERROR: credentials.json is not valid JSON")
    except Exception as e:
        print(f"❌ ERROR: {str(e)}")

if __name__ == "__main__":
    get_project_info()
