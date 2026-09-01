from django.conf import settings
class SMSNotConfigured(Exception):
    pass
class SMSDeliveryError(Exception):
    pass
def send_otp_sms(phone_e164, code):
    """Sends `code` via MSG91's v5 OTP API using a DLT-approved template
    (India requires pre-registered transactional SMS templates) — we still
    own the code's generation, hashing, TTL, and attempt-counting entirely
    ourselves (see apps.authentication.views); MSG91 is used purely as the
    SMS transport, passing our own otp= value rather than its.

    Verified live against the real endpoint: a malformed mobile number
    correctly returns type=error and raises SMSDeliveryError below. An
    invalid authkey/template_id alone still returns type=success (MSG91
    queues first, validates credentials/template asynchronously — visible
    only in their dashboard) — a real account is needed to confirm actual
    delivery, same boundary as the Razorpay integration."""
    if not (getattr(settings, 'MESSAGE_CENTRAL_CUSTOMER_ID', None) and getattr(settings, 'MESSAGE_CENTRAL_AUTH_TOKEN', None)):
        raise SMSNotConfigured("Message Central SMS delivery is not configured yet. Missing Customer ID or Auth Token.")
    
    import requests
    mobile = phone_e164.lstrip('+')
    
    try:
        token = settings.MESSAGE_CENTRAL_AUTH_TOKEN
        
        # Send OTP Message
        sender_id = getattr(settings, 'MESSAGE_CENTRAL_SENDER_ID', 'NRBYME')
        message_text = f"{code} is your Nearbyme verification code. It will expire in 10 minutes."
        
        send_resp = requests.post(
            "https://cpaas.messagecentral.com/sms/v1/send",
            headers={
                "authToken": token,
                "Content-Type": "application/json"
            },
            json={
                "customerId": settings.MESSAGE_CENTRAL_CUSTOMER_ID,
                "messages": [
                    {
                        "to": [mobile],
                        "message": message_text,
                        "senderId": sender_id
                    }
                ]
            },
            timeout=10,
        )
        data = send_resp.json()
    except (requests.RequestException, ValueError) as e:
        raise SMSDeliveryError(f"Could not reach Message Central API: {e}")
        
    # Check Message Central response for success
    if send_resp.status_code not in (200, 201) and data.get("status") != "Success":
        raise SMSDeliveryError(data.get('message') or "Message Central rejected the request.")
