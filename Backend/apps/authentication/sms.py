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
    if not (settings.MSG91_AUTH_KEY and settings.MSG91_OTP_TEMPLATE_ID):
        raise SMSNotConfigured("SMS delivery is not configured yet.")
    import requests
    mobile = phone_e164.lstrip('+')
    try:
        resp = requests.post(
            "https://control.msg91.com/api/v5/otp",
            params={
                "template_id": settings.MSG91_OTP_TEMPLATE_ID,
                "mobile": mobile,
                "authkey": settings.MSG91_AUTH_KEY,
                "otp": code,
            },
            timeout=10,
        )
        data = resp.json()
    except (requests.RequestException, ValueError) as e:
        raise SMSDeliveryError(f"Could not reach the SMS provider: {e}")
    if data.get('type') != 'success':
        raise SMSDeliveryError(data.get('message') or "SMS provider rejected the request.")
