import json
import urllib.request
import urllib.error
EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'
def notify_user(user, title, message, notif_type='SYSTEM', data=None):
    """Create a Notification row (read by the in-app bell) and, if the user
    has registered a push token, send a push too. Central place for any
    event that should alert a user — new booking, chat message, tip, review."""
    if not user:
        return
    from apps.core.models import Notification
    Notification.objects.create(user=user, title=title, message=message, type=notif_type)
    token = getattr(user, 'expo_push_token', None)
    if token:
        send_expo_push_notification(token, title, message, data=data)
def send_expo_push_notification(token, title, body, data=None):
    if not token or not token.startswith("ExponentPushToken"):
        print(f"Invalid Expo Push Token: {token}")
        return False
    headers = {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
    }
    payload = {
        'to': token,
        'title': title,
        'body': body,
    }
    if data:
        payload['data'] = data
    req = urllib.request.Request(
        EXPO_PUSH_URL,
        data=json.dumps(payload).encode('utf-8'),
        headers=headers,
        method='POST'
    )
    try:
        response = urllib.request.urlopen(req)
        response_data = json.loads(response.read().decode('utf-8'))
        print(f"Expo push response: {response_data}")
        return True
    except urllib.error.URLError as e:
        print(f"Failed to send Expo push notification: {e}")
        return False
