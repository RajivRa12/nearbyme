import requests

token = "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJDLUEwOEM5RUEyRUY0RDQ0MiIsImlhdCI6MTc1NzQwMjQwMSwiZXhwIjoxOTE1MDgyNDAxfQ.RFPXlOS1zcqrJ_2XYbC5Xh-m07jtMNR1rUeDd0xIsRGn2wWxqaK_8moczGabPFqb8YaiuQnzkSAYJxmt-2suXw"
customer_id = "C-A08C9EA2EF4D442"

for url in [
    "https://cpaas.messagecentral.com/sms/v1/send",
    "https://cpaas.messagecentral.com/message/v1/send",
    "https://cpaas.messagecentral.com/verification/v3/send"
]:
    print(f"Testing {url}")
    resp = requests.post(url, headers={"authToken": token}, json={"customerId": customer_id, "messages": [{"to": ["919999999999"], "message": "Test Message", "senderId": "NRBYME"}]})
    print(resp.status_code)
    print(resp.text[:200])
    print("-" * 20)
