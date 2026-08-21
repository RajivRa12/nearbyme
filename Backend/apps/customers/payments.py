from django.conf import settings
class PaymentsNotConfigured(Exception):
    pass
class PaymentVerificationError(Exception):
    pass
def _client():
    if not (settings.RAZORPAY_KEY_ID and settings.RAZORPAY_KEY_SECRET):
        raise PaymentsNotConfigured("Online payments are not set up for this store yet.")
    import razorpay
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
def create_order(amount_paise, receipt, notes=None):
    client = _client()
    return client.order.create({
        "amount": amount_paise, "currency": "INR", "receipt": receipt, "notes": notes or {},
    })
def verify_payment(order_id, payment_id, signature):
    import razorpay
    client = _client()
    try:
        client.utility.verify_payment_signature({
            'razorpay_order_id': order_id,
            'razorpay_payment_id': payment_id,
            'razorpay_signature': signature,
        })
    except razorpay.errors.SignatureVerificationError:
        raise PaymentVerificationError("Payment verification failed.")
def refund_payment(payment_id):
    client = _client()
    client.payment.refund(payment_id, {})
