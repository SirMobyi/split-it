import { Linking, Platform } from 'react-native';

export interface UPIPaymentParams {
  vpa: string;        // UPI VPA (e.g., name@upi)
  name: string;       // Payee name
  amount: number;     // Amount in INR
  note?: string;      // Transaction note
  txnRef?: string;    // Transaction reference
}

/**
 * Generate a UPI deep link URL.
 * This follows the NPCI UPI deep link specification.
 */
export function buildUPIUrl(params: UPIPaymentParams): string {
  const query = new URLSearchParams({
    pa: params.vpa,
    pn: params.name,
    am: params.amount.toFixed(2),
    cu: 'INR',
    ...(params.note && { tn: params.note }),
    ...(params.txnRef && { tr: params.txnRef }),
  });

  return `upi://pay?${query.toString()}`;
}

/**
 * Launch the UPI payment intent.
 * Returns true if a UPI app was opened, false otherwise.
 */
export async function launchUPIPayment(params: UPIPaymentParams): Promise<boolean> {
  const url = buildUPIUrl(params);

  const canOpen = await Linking.canOpenURL(url);
  if (!canOpen) {
    return false;
  }

  await Linking.openURL(url);
  return true;
}

/**
 * Check if any UPI app is available on the device.
 */
export async function isUPIAvailable(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  return Linking.canOpenURL('upi://pay');
}
