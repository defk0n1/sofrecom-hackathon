"""
FastAPI Router for Gmail Push Notifications via Cloud Pub/Sub
Handles webhook endpoints for receiving Gmail mailbox updates
"""
from fastapi import APIRouter, HTTPException, Request, Body
from pydantic import BaseModel
from typing import Dict, Any, Optional
import base64
import json
from services.pubsub_service import get_pubsub_service
from services.gmail_service import GmailService

router = APIRouter(prefix="/pubsub", tags=["pubsub"])

class PubSubMessage(BaseModel):
    """Cloud Pub/Sub push message format"""
    message: Dict[str, Any]
    subscription: str

class WatchRequest(BaseModel):
    """Request to start watching a Gmail mailbox"""
    topic_name: str
    label_ids: Optional[list] = ["INBOX"]
    label_filter_behavior: Optional[str] = "INCLUDE"

@router.post("/webhook")
async def pubsub_webhook(request: Request):
    """
    Webhook endpoint for receiving Gmail push notifications from Cloud Pub/Sub
    
    This endpoint receives POST requests from Cloud Pub/Sub when Gmail mailbox changes occur.
    """
    try:
        # Parse request body
        body = await request.json()
        
        print("\n" + "="*60)
        print("🔔 INCOMING PUBSUB NOTIFICATION")
        print("="*60)
        
        # Extract message from Pub/Sub format
        message_data = body.get('message', {})
        
        if not message_data:
            print("❌ No message data in request")
            raise HTTPException(status_code=400, detail="No message data")
        
        # Decode the base64-encoded data
        encoded_data = message_data.get('data', '')
        if not encoded_data:
            print("❌ No data field in message")
            raise HTTPException(status_code=400, detail="No data in message")
        
        # Decode base64url-encoded JSON
        decoded_data = base64.urlsafe_b64decode(encoded_data).decode('utf-8')
        notification_data = json.loads(decoded_data)
        
        print(f"📧 Email: {notification_data.get('emailAddress')}")
        print(f"📊 History ID: {notification_data.get('historyId')}")
        
        # Process the notification
        pubsub_service = get_pubsub_service()
        result = await pubsub_service.handle_pubsub_notification(notification_data)
        
        print(f"✅ Result: {result}")
        print("="*60 + "\n")
        
        # Return 200 OK to acknowledge receipt
        return {"status": "success", "result": result}
        
    except json.JSONDecodeError as e:
        print(f"❌ JSON decode error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Invalid JSON: {str(e)}")
    except Exception as e:
        print(f"❌ Error processing webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/watch")
async def start_watch(watch_request: WatchRequest):
    """
    Start watching a Gmail mailbox for changes
    
    Example request body:
    {
        "topic_name": "projects/myproject/topics/gmail-notifications",
        "label_ids": ["INBOX"],
        "label_filter_behavior": "INCLUDE"
    }
    """
    try:
        gmail_service = GmailService()
        
        request_body = {
            'labelIds': watch_request.label_ids,
            'topicName': watch_request.topic_name,
            'labelFilterBehavior': watch_request.label_filter_behavior
        }
        
        print(f"\n🔍 Starting watch on Gmail mailbox...")
        print(f"   Topic: {watch_request.topic_name}")
        print(f"   Labels: {watch_request.label_ids}")
        
        # Call Gmail API watch
        response = gmail_service.service.users().watch(
            userId='me',
            body=request_body
        ).execute()
        
        print(f"✅ Watch started successfully!")
        print(f"   History ID: {response.get('historyId')}")
        print(f"   Expiration: {response.get('expiration')}")
        
        # Save the initial history ID
        pubsub_service = get_pubsub_service()
        pubsub_service._save_history_id(
            response.get('historyId'),
            response.get('expiration')
        )
        
        return {
            "status": "success",
            "history_id": response.get('historyId'),
            "expiration": response.get('expiration'),
            "message": "Watch started successfully. You will receive notifications at your webhook endpoint."
        }
        
    except Exception as e:
        print(f"❌ Error starting watch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/stop")
async def stop_watch():
    """
    Stop watching the Gmail mailbox
    """
    try:
        gmail_service = GmailService()
        
        print(f"\n🛑 Stopping Gmail watch...")
        
        # Call Gmail API stop
        gmail_service.service.users().stop(userId='me').execute()
        
        print(f"✅ Watch stopped successfully!")
        
        return {
            "status": "success",
            "message": "Watch stopped successfully. No more notifications will be sent."
        }
        
    except Exception as e:
        print(f"❌ Error stopping watch: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def get_watch_status():
    """
    Get the current watch status and history ID
    """
    try:
        pubsub_service = get_pubsub_service()
        status = pubsub_service.get_watch_status()
        return status
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/test")
async def test_notification(notification: Dict[str, Any] = Body(...)):
    """
    Test endpoint to manually trigger notification processing
    
    Example body:
    {
        "emailAddress": "user@example.com",
        "historyId": "1234567890"
    }
    """
    try:
        pubsub_service = get_pubsub_service()
        result = await pubsub_service.handle_pubsub_notification(notification)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
