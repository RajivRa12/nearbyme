import json
import urllib.request
import urllib.error

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

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
