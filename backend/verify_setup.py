"""
Gmail Push Notifications - Setup Verification Script
Run this to verify your setup is correct before starting
"""
import os
import sys
import json
import sqlite3
import requests

def print_header(text):
    print("\n" + "=" * 70)
    print(text)
    print("=" * 70)

def print_check(passed, message):
    status = "✅" if passed else "❌"
    print(f"{status} {message}")
    return passed

def check_files():
    """Check if required files exist"""
    print_header("Checking Required Files")
    
    checks = []
    checks.append(print_check(
        os.path.exists('credentials.json'),
        "credentials.json exists"
    ))
    checks.append(print_check(
        os.path.exists('token.json'),
        "token.json exists (Gmail authenticated)"
    ))
    checks.append(print_check(
        os.path.exists('services/pubsub_service.py'),
        "pubsub_service.py exists"
    ))
    checks.append(print_check(
        os.path.exists('routers/pubsub_router.py'),
        "pubsub_router.py exists"
    ))
    checks.append(print_check(
        os.path.exists('db/email.db'),
        "email.db exists"
    ))
    
    return all(checks)

def check_dependencies():
    """Check if required packages are installed"""
    print_header("Checking Python Dependencies")
    
    checks = []
    
    try:
        import google.cloud.pubsub_v1
        checks.append(print_check(True, "google-cloud-pubsub installed"))
    except ImportError:
        checks.append(print_check(False, "google-cloud-pubsub NOT installed"))
        print("   Install with: pip install google-cloud-pubsub==2.26.1")
    
    try:
        from googleapiclient.discovery import build
        checks.append(print_check(True, "google-api-python-client installed"))
    except ImportError:
        checks.append(print_check(False, "google-api-python-client NOT installed"))
    
    try:
        from fastapi import FastAPI
        checks.append(print_check(True, "fastapi installed"))
    except ImportError:
        checks.append(print_check(False, "fastapi NOT installed"))
    
    return all(checks)

def check_database():
    """Check database schema"""
    print_header("Checking Database")
    
    if not os.path.exists('db/email.db'):
        print_check(False, "Database file not found")
        return False
    
    checks = []
    
    try:
        conn = sqlite3.connect('db/email.db')
        cursor = conn.cursor()
        
        # Check emails table
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='emails'")
        checks.append(print_check(
            cursor.fetchone() is not None,
            "'emails' table exists"
        ))
        
        # Check if watch_state table exists (will be created automatically)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='watch_state'")
        has_watch_table = cursor.fetchone() is not None
        print_check(
            True,  # This is optional, will be created on first notification
            f"'watch_state' table {'exists' if has_watch_table else 'will be created on first notification'}"
        )
        
        # Count emails
        cursor.execute("SELECT COUNT(*) FROM emails")
        count = cursor.fetchone()[0]
        print(f"   📧 Current emails in database: {count}")
        
        conn.close()
        checks.append(True)
        
    except Exception as e:
        checks.append(print_check(False, f"Database error: {str(e)}"))
    
    return all(checks)

def check_backend_running():
    """Check if backend is running"""
    print_header("Checking Backend Server")
    
    try:
        response = requests.get('http://localhost:5000/health', timeout=5)
        if response.status_code == 200:
            print_check(True, "Backend is running on port 5000")
            
            # Check if pubsub endpoints are available
            try:
                response = requests.get('http://localhost:5000/', timeout=5)
                data = response.json()
                has_pubsub = 'pubsub_webhook' in data.get('endpoints', {})
                print_check(
                    has_pubsub,
                    "Pub/Sub endpoints registered"
                )
                return True
            except:
                return False
        else:
            print_check(False, "Backend returned non-200 status")
            return False
    except requests.exceptions.RequestException:
        print_check(False, "Backend NOT running (start with: python main.py)")
        print("   Start the backend first: cd backend && python main.py")
        return False

def check_project_config():
    """Check project configuration"""
    print_header("Checking Project Configuration")
    
    if not os.path.exists('credentials.json'):
        print_check(False, "credentials.json not found")
        return False
    
    try:
        with open('credentials.json', 'r') as f:
            creds = json.load(f)
        
        if 'installed' in creds:
            project_id = creds['installed'].get('project_id')
        elif 'web' in creds:
            project_id = creds['web'].get('project_id')
        else:
            project_id = None
        
        if project_id:
            print_check(True, f"Project ID: {project_id}")
            print(f"\n   Your topic name should be:")
            print(f"   projects/{project_id}/topics/gmail-notifications")
            return True
        else:
            print_check(False, "Could not extract project ID")
            return False
            
    except Exception as e:
        print_check(False, f"Error reading credentials: {str(e)}")
        return False

def print_next_steps(all_passed):
    """Print next steps based on results"""
    print_header("Next Steps")
    
    if not all_passed:
        print("\n⚠️  Some checks failed. Please fix the issues above before proceeding.\n")
        print("Common fixes:")
        print("  - Install dependencies: pip install -r requirements.txt")
        print("  - Start backend: python main.py")
        print("  - Authenticate Gmail: python setup_gmail_auth.py")
        return
    
    print("\n✅ All checks passed! You're ready to set up push notifications.\n")
    print("Next steps:")
    print("\n1. Follow the setup guide:")
    print("   - Quick start: GMAIL_PUSH_QUICK_START.md")
    print("   - Detailed: GMAIL_PUSH_NOTIFICATIONS_SETUP.md")
    print("\n2. Get your project configuration:")
    print("   python get_project_info.py")
    print("\n3. Complete Cloud Console setup:")
    print("   - Enable Pub/Sub API")
    print("   - Create topic")
    print("   - Grant permissions")
    print("   - Create subscription")
    print("\n4. Start watching:")
    print('   curl -X POST http://localhost:5000/pubsub/watch \\')
    print('     -H "Content-Type: application/json" \\')
    print('     -d \'{"topic_name": "projects/YOUR-PROJECT-ID/topics/gmail-notifications"}\'')
    print()

def main():
    """Run all checks"""
    print_header("Gmail Push Notifications - Setup Verification")
    print("This script will verify your setup is ready for push notifications.\n")
    
    # Change to backend directory if needed
    if os.path.exists('backend'):
        os.chdir('backend')
        print("📁 Changed to backend directory\n")
    
    # Run all checks
    checks = []
    checks.append(check_files())
    checks.append(check_dependencies())
    checks.append(check_database())
    checks.append(check_project_config())
    checks.append(check_backend_running())
    
    all_passed = all(checks)
    
    # Print summary
    print_header("Summary")
    if all_passed:
        print("\n🎉 All checks passed! Ready to proceed with setup.")
    else:
        print("\n⚠️  Some checks failed. Please fix the issues above.")
    
    # Print next steps
    print_next_steps(all_passed)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
