import Razorpay from 'razorpay';

let razorpayClient: any = null;

export function getRazorpayClient() {
  if (razorpayClient !== null) {
    return razorpayClient;
  }

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (keyId && keySecret) {
    try {
      razorpayClient = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
      console.log('Razorpay initialized successfully with key:', keyId);
    } catch (error) {
      console.error('Failed to initialize Razorpay client:', error);
    }
  } else {
    console.log('Razorpay credentials missing in environment. Running in Razorpay Mock Sandbox Mode.');
  }

  return razorpayClient;
}
