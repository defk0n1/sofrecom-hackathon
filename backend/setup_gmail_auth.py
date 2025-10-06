#!/usr/bin/env python3
"""
Gmail Authentication Setup Script
Run this script once to set up Gmail authentication for MailMate AI
"""

import os
import sys
from services.gmail_service import GmailService

def main():
    print("=" * 70)
    print("📧 MailMate AI - Gmail Authentication Setup")
    print("=" * 70)
    print()
    
    # Check for credentials.json
    if not os.path.exists('credentials.json'):
        print("❌ ERROR: credentials.json not found!")
        print()
        print("Please follow these steps:")
        print("1. Go to https://console.cloud.google.com/")
        print("2. Create/select a project")
        print("3. Enable Gmail API")
        print("4. Create OAuth 2.0 credentials (Desktop app)")
        print("5. Download credentials.json")
        print("6. Place it in the backend directory")
        print()
        sys.exit(1)
    
    print("✅ Found credentials.json")
    print()
    
    # Check for existing token
    if os.path.exists('token.json'):
        print("⚠️  Found existing token.json")
        response = input("Do you want to re-authenticate? (y/N): ").strip().lower()
        if response != 'y':
            print("Keeping existing authentication.")
            sys.exit(0)
        else:
            os.remove('token.json')
            print("Removed old token.json")
    
    print()
    print("🔐 Starting authentication process...")
    print("A browser window will open. Please:")
    print("  1. Select your Google account")
    print("  2. Grant Gmail access permissions")
    print("  3. Return to this terminal")
    print()
    input("Press Enter to continue...")
    print()
    
    try:
        # Initialize Gmail service (will trigger authentication)
        GmailService()  # Authentication happens in __init__
        
        print()
        print("=" * 70)
        print("✅ SUCCESS! Gmail authentication complete!")
        print("=" * 70)
        print()
        print("Your Gmail is now connected to MailMate AI.")
        print("The authentication token has been saved to token.json")
        print()
        print("You can now start the backend server with:")
        print("  python main.py")
        print()
        
    except Exception as e:
        print()
        print("=" * 70)
        print("❌ AUTHENTICATION FAILED")
        print("=" * 70)
        print(f"Error: {str(e)}")
        print()
        print("Troubleshooting tips:")
        print("1. Verify credentials.json is correct")
        print("2. Check if Gmail API is enabled in Google Cloud Console")
        print("3. Ensure OAuth consent screen is configured")
        print("4. Add yourself as a test user if app is in testing mode")
        print()
        sys.exit(1)

if __name__ == "__main__":
    main()
