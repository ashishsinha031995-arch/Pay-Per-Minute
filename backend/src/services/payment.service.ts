import Razorpay from 'razorpay';

let razorpayClient: any = null;

export function isPlaceholder(val: string | undefined): boolean {
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
}

export function getCleanRazorpayKeyId(): string | undefined {
  return 'rzp_test_T8D90KI42881P9';
}

export function getCleanRazorpayKeySecret(): string | undefined {
  return '4avGKvRQwpLUMO1jmlBL0242';
}

export function getRazorpayClient() {
  if (razorpayClient !== null) {
    return razorpayClient;
  }

  const keyId = getCleanRazorpayKeyId();
  const keySecret = getCleanRazorpayKeySecret();

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
    console.log('Razorpay credentials missing. Running in Razorpay Mock Sandbox Mode.');
  }

  return razorpayClient;
}

export function getRazorpayErrorMessage(err: any): string {
  if (!err) return 'Unknown error';
  if (typeof err === 'string') return err;

  // Try to find description in nested error objects
  let description = '';
  if (err.error && typeof err.error === 'object' && err.error.description) {
    description = err.error.description;
  } else if (err.description) {
    description = err.description;
  } else if (err.message) {
    description = err.message;
  } else {
    // Stringify to check if "Authentication failed" is in it
    const str = JSON.stringify(err);
    if (str.includes('Authentication failed')) {
      description = 'Authentication failed';
    }
  }

  if (description === 'Authentication failed' || description.includes('Authentication failed')) {
    const keyId = getCleanRazorpayKeyId() || '';
    const maskedKey = keyId.length > 8 ? `${keyId.substring(0, 8)}...${keyId.substring(keyId.length - 4)}` : keyId;
    const secretLen = (getCleanRazorpayKeySecret() || '').length;
    return `Authentication failed. Razorpay rejected the API credentials. Key ID: "${maskedKey}", Secret length: ${secretLen} characters. Please verify your RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your settings panel for typos, trailing spaces, or correct environment match (Test vs Live).`;
  }

  if (description) return description;
  return JSON.stringify(err);
}

export function getResponseRazorpayKeyId(isMock: boolean): string {
  const keyId = getCleanRazorpayKeyId();
  return keyId || 'rzp_test_T8D90KI42881P9';
}
