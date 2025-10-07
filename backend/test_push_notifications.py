"""
Test Gmail Push Notifications
This script tests your push notification setup
"""
import requests
import json
import base64

BACKEND_URL = "http://localhost:5000"

def print_section(title):
    print("\n" + "="*60)
    print(title)
    print("="*60)

def test_1_health_check():
    """Test 1: Backend health check"""
    print_section("Test 1: Backend Health Check")
    
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            print("✅ Backend is running")
            return True
        else:
            print(f"❌ Backend returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend not accessible: {str(e)}")
        print("   Make sure to run: python main.py")
        return False

def test_2_endpoints_registered():
    """Test 2: Check if pubsub endpoints are registered"""
    print_section("Test 2: Pub/Sub Endpoints")
    
    try:
        response = requests.get(f"{BACKEND_URL}/", timeout=5)
        data = response.json()
        endpoints = data.get('endpoints', {})
        
        required = ['pubsub_webhook', 'pubsub_watch', 'pubsub_stop', 'pubsub_status']
        all_present = all(ep in endpoints for ep in required)
        
        if all_present:
            print("✅ All Pub/Sub endpoints registered:")
            for ep in required:
                print(f"   - {endpoints[ep]}")
            return True
        else:
            print("❌ Some endpoints missing")
            return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_3_watch_status():
    """Test 3: Check watch status"""
    print_section("Test 3: Watch Status")
    
    try:
        response = requests.get(f"{BACKEND_URL}/pubsub/status", timeout=5)
        data = response.json()
        
        print(f"Status: {data.get('status')}")
        
        if data.get('status') == 'active':
            print("✅ Watch is active")
            print(f"   History ID: {data.get('history_id')}")
            print(f"   Last Updated: {data.get('last_updated')}")
        elif data.get('status') == 'not_configured':
            print("⚠️  Watch not configured yet")
            print("   Run this to start watching:")
            print('   curl -X POST http://localhost:5000/pubsub/watch \\')
            print('     -H "Content-Type: application/json" \\')
            print('     -d \'{"topic_name": "projects/YOUR-PROJECT/topics/gmail-notifications"}\'')
        else:
            print(f"❌ Unexpected status: {data.get('status')}")
        
        return True
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_4_manual_notification():
    """Test 4: Send manual test notification"""
    print_section("Test 4: Manual Test Notification")
    
    print("Sending test notification...")
    
    test_data = {
        "emailAddress": "test@example.com",
        "historyId": "1234567890"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/pubsub/test",
            json=test_data,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Test notification processed")
            print(f"   Status: {result.get('status')}")
            print(f"   Message: {result.get('message')}")
            return True
        else:
            print(f"❌ Request failed with status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def test_5_webhook_format():
    """Test 5: Test webhook with proper Pub/Sub format"""
    print_section("Test 5: Webhook with Pub/Sub Format")
    
    print("Sending notification in Pub/Sub format...")
    
    # Create notification data
    notification_data = {
        "emailAddress": "test@example.com",
        "historyId": "9876543210"
    }
    
    # Base64 encode it
    encoded = base64.urlsafe_b64encode(
        json.dumps(notification_data).encode()
    ).decode()
    
    # Create Pub/Sub message format
    pubsub_message = {
        "message": {
            "data": encoded,
            "messageId": "test-message-123",
            "publishTime": "2025-01-07T10:00:00Z"
        },
        "subscription": "projects/test/subscriptions/test"
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/pubsub/webhook",
            json=pubsub_message,
            timeout=10
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Webhook processed notification")
            print(f"   Status: {result.get('status')}")
            if 'result' in result:
                print(f"   New emails: {result['result'].get('new_emails', 0)}")
            return True
        else:
            print(f"❌ Webhook returned status {response.status_code}")
            print(f"   Response: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

def print_summary(results):
    """Print test summary"""
    print_section("Test Summary")
    
    passed = sum(results)
    total = len(results)
    
    print(f"\n{passed}/{total} tests passed\n")
    
    if passed == total:
        print("🎉 All tests passed!")
        print("\nYour backend is ready for push notifications!")
        print("\nNext steps:")
        print("1. Complete Cloud Console setup (see GMAIL_PUSH_QUICK_START.md)")
        print("2. Start watching your Gmail:")
        print('   curl -X POST http://localhost:5000/pubsub/watch \\')
        print('     -H "Content-Type: application/json" \\')
        print('     -d \'{"topic_name": "projects/YOUR-PROJECT/topics/gmail-notifications"}\'')
        print("3. Send yourself a test email!")
    else:
        print("⚠️  Some tests failed. Please check the errors above.")
        print("\nCommon issues:")
        print("- Backend not running: python main.py")
        print("- Missing dependencies: pip install -r requirements.txt")
        print("- Gmail not authenticated: python setup_gmail_auth.py")

def main():
    """Run all tests"""
    print("="*60)
    print("Gmail Push Notifications - Test Suite")
    print("="*60)
    print("\nThis will test your push notification setup.\n")
    
    results = []
    
    # Run tests
    results.append(test_1_health_check())
    if results[0]:  # Only continue if backend is running
        results.append(test_2_endpoints_registered())
        results.append(test_3_watch_status())
        results.append(test_4_manual_notification())
        results.append(test_5_webhook_format())
    
    # Print summary
    print_summary(results)
    
    return 0 if all(results) else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
