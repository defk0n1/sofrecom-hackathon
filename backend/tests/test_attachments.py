"""
Simple test script for attachment management functionality (syntax and database only)
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import sqlite3

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "email.db")

def test_attachment_functions():
    """Test attachment management functions"""
    print("=" * 60)
    print("Testing Attachment Management Functions")
    print("=" * 60)
    
    # Test 1: Check database table exists
    print("\n1. Checking attachments table...")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='attachments'")
        result = cursor.fetchone()
        if result:
            print("   ✓ Attachments table exists")
        else:
            print("   ✗ Attachments table does not exist")
        conn.close()
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
    
    # Test 2: Check database schema
    print("\n2. Checking attachments table schema...")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("PRAGMA table_info(attachments)")
        columns = cursor.fetchall()
        
        expected_columns = ['id', 'email_id', 'attachment_id', 'filename', 'mime_type', 'size', 'created_at']
        actual_columns = [col[1] for col in columns]
        
        missing_columns = set(expected_columns) - set(actual_columns)
        if not missing_columns:
            print("   ✓ All expected columns present:")
            for col in columns:
                print(f"      - {col[1]} ({col[2]})")
        else:
            print(f"   ✗ Missing columns: {missing_columns}")
        
        conn.close()
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
    
    # Test 3: Test database operations
    print("\n3. Testing database operations...")
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Try to insert a test record
        test_email_id = "test_email_123"
        test_attachment_id = "test_attachment_456"
        
        cursor.execute("""
            INSERT OR IGNORE INTO attachments (email_id, attachment_id, filename, mime_type, size)
            VALUES (?, ?, ?, ?, ?)
        """, (test_email_id, test_attachment_id, "test.pdf", "application/pdf", 1024))
        
        # Try to retrieve it
        cursor.execute("""
            SELECT * FROM attachments WHERE email_id = ? AND attachment_id = ?
        """, (test_email_id, test_attachment_id))
        
        result = cursor.fetchone()
        if result:
            print("   ✓ Database insert and select working")
            print(f"      Record: {result}")
            
            # Clean up test data
            cursor.execute("DELETE FROM attachments WHERE email_id = ?", (test_email_id,))
            conn.commit()
            print("   ✓ Test data cleaned up")
        else:
            print("   ✗ Failed to retrieve inserted test data")
        
        conn.close()
    except Exception as e:
        print(f"   ✗ Error: {str(e)}")
    
    # Test 4: Check Python file syntax
    print("\n4. Checking Python file syntax...")
    files_to_check = [
        'services/gmail_service.py',
        'services/attachment_service.py',
        'routers/attachment_manager.py',
        'routers/gmail_router.py',
        'models/schemas.py'
    ]
    
    all_valid = True
    for file_path in files_to_check:
        full_path = os.path.join(os.path.dirname(__file__), '..', file_path)
        try:
            with open(full_path, 'r') as f:
                compile(f.read(), full_path, 'exec')
            print(f"   ✓ {file_path} syntax valid")
        except SyntaxError as e:
            print(f"   ✗ {file_path} syntax error: {str(e)}")
            all_valid = False
        except Exception as e:
            print(f"   ⚠ {file_path} could not be checked: {str(e)}")
    
    if all_valid:
        print("   ✓ All files have valid syntax")
    
    print("\n" + "=" * 60)
    print("Testing Complete")
    print("=" * 60)

if __name__ == '__main__':
    test_attachment_functions()

