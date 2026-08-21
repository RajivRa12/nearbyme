// Web-only Razorpay Checkout loader. There is no native module wired in yet,
// so callers must gate this behind Platform.OS === "web" — see pay.tsx.
function loadScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof document === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export type RazorpayResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
} | null;

export async function openRazorpayCheckout(opts: {
  keyId: string;
  amount: number;
  currency: string;
  orderId: string;
  name: string;
  description: string;
}): Promise<RazorpayResult> {
  const loaded = await loadScript();
  if (!loaded) return null;
  return new Promise((resolve) => {
    const rzp = new (window as any).Razorpay({
      key: opts.keyId,
      amount: opts.amount,
      currency: opts.currency,
      order_id: opts.orderId,
      name: opts.name,
      description: opts.description,
      theme: { color: "#5c6f59" },
      handler: (response: RazorpayResult) => resolve(response),
      modal: { ondismiss: () => resolve(null) },
    });
    rzp.open();
  });
}
