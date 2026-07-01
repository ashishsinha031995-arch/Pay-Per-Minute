import Razorpay from 'razorpay';

let razorpayClient: any = null;

const isPlaceholder = (val: string | undefined): boolean => {
  if (!val) return true;
  const v = val.toLowerCase().trim();
  return (
    v === '' ||
    v.includes('placeholder') ||
    v.includes('your_') ||
    v.includes('my_') ||
    v.includes('mock') ||
    v === 'undefined' ||
    v === 'null'
  );
};

export function getCleanRazorpayKeyId(): string | undefined {
  const keyId = process.env.RAZORPAY_KEY_ID;
  if (!keyId) return undefined;
  return keyId.trim().replace(/^['"]|['"]$/g, '');
}

export function getCleanRazorpayKeySecret(): string | undefined {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return undefined;
  return keySecret.trim().replace(/^['"]|['"]$/g, '');
}

export function getRazorpayClient() {
  if (razorpayClient !== null) {
    return razorpayClient;
  }

  const keyId = getCleanRazorpayKeyId();
  const keySecret = getCleanRazorpayKeySecret();

  if (keyId && keySecret && !isPlaceholder(keyId) && !isPlaceholder(keySecret)) {
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
    console.log('Razorpay credentials missing or placeholder in environment. Running in Razorpay Mock Sandbox Mode.');
  }

  return razorpayClient;
}

export function getRazorpayErrorMessage(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;
  if (err.message) return err.message;
  if (err.error && typeof err.error === 'object') {
    if (err.error.description) return err.error.description;
    if (err.error.code) return `${err.error.code}: ${err.error.reason || 'No reason specified'}`;
    return JSON.stringify(err.error);
  }
  if (err.description) return err.description;
  return JSON.stringify(err);
}
