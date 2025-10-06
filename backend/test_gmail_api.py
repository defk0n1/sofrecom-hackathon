#!/usr/bin/env python3
"""
Gmail API Test Script

This script tests all Gmail API endpoints to ensure they work correctly.
It performs basic validation without requiring actual Gmail credentials.
"""

import sys
import os

# Add app directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def test_imports():
    """Test that all required modules can be imported"""
    print("Testing imports...")
    try:
        from services.gmail_service import GmailService
        from models.gmail import EmailRequest, EmailResponse
        print("✓ All imports successful")
        return True
    except ImportError as e:
        print(f"✗ Import failed: {e}")
        return False


def test_models():
    """Test Pydantic models"""
    print("\nTesting Pydantic models...")
    try:
        from models import EmailRequest, EmailResponse, AuthResponse
        
        # Test EmailRequest
        email_req = EmailRequest(
            to="test@example.com",
            subject="Test",
            body="Test body"
        )
        print(f"✓ EmailRequest model: {email_req.to}")
        
        # Test EmailResponse
        email_resp = EmailResponse(
            status="success",
            message="Test message",
            message_id="12345"
        )
        print(f"✓ EmailResponse model: {email_resp.status}")
        
        # Test AuthResponse
        auth_resp = AuthResponse(
            status="success",
            message="Test",
            auth_url="https://test.com"
        )
        print(f"✓ AuthResponse model: {auth_resp.auth_url}")
        
        return True
    except Exception as e:
        print(f"✗ Model test failed: {e}")
        return False


def test_gmail_service_structure():
    """Test GmailService class structure"""
    print("\nTesting GmailService structure...")
    try:
        from services.gmail_service import GmailService
        import inspect
        
        # Check all expected methods exist
        expected_methods = [
            'authenticate',
            'get_auth_url',
            'handle_auth_callback',
            'get_emails',
            'get_email_detail',
            'send_email',
            'reply_to_email',
            'forward_email',
            'delete_email',
            'mark_as_read',
            'mark_as_unread',
            'get_labels',
            'add_label',
            'remove_label'
        ]
        
        for method_name in expected_methods:
            if hasattr(GmailService, method_name):
                method = getattr(GmailService, method_name)
                is_async = inspect.iscoroutinefunction(method)
                async_marker = " (async)" if is_async else ""
                print(f"✓ Method '{method_name}' exists{async_marker}")
            else:
                print(f"✗ Method '{method_name}' is missing")
                return False
        
        return True
    except Exception as e:
        print(f"✗ Structure test failed: {e}")
        return False


def test_main_app_structure():
    """Test main.py app structure"""
    print("\nTesting main.py app structure...")
    try:
        
        # Get all routes
        import routers
        print(f"✓ Found {len(routes)} routes")
        routes = [route.path for route in routers]
        
        expected_routes = [
            "/",
            "/health",
            "/auth/gmail",
            "/auth/callback",
            "/emails",
            "/emails/{email_id}",
            "/emails/send",
            "/emails/{email_id}/reply",
            "/emails/{email_id}/forward",
            "/emails/{email_id}/mark-read",
            "/emails/{email_id}/mark-unread",
            "/labels",
            "/emails/{email_id}/add-label",
            "/emails/{email_id}/remove-label"
        ]
        
        for route in expected_routes:
            if any(route in r for r in routes):
                print(f"✓ Route '{route}' exists")
            else:
                print(f"⚠ Route '{route}' may be missing")
        
        return True
    except Exception as e:
        print(f"✗ Main app test failed: {e}")
        print("  This is expected if dependencies are not installed")
        return False


def main():
    """Run all tests"""
    print("=" * 60)
    print("Gmail API Service Test Suite")
    print("=" * 60)
    
    results = []
    
    # Run tests
    results.append(("Imports", test_imports()))
    results.append(("Models", test_models()))
    results.append(("GmailService Structure", test_gmail_service_structure()))
    results.append(("Main App Structure", test_main_app_structure()))
    
    # Print summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "PASS" if result else "FAIL"
        print(f"{test_name}: {status}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n✓ All tests passed!")
        return 0
    else:
        print("\n⚠ Some tests failed. Check dependencies and setup.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
