/**
 * Order QR Code Component
 * Requirements: 8.2 - Generate QR code containing order_id
 * 
 * Displays a QR code for takeout order pickup verification
 */

import { memo } from 'react';
import QRCode from 'react-qr-code';
import { createOrderQRData, formatPickupCode } from '~/lib/orderUtils';

export interface OrderQRCodeProps {
  /** The order ID to encode in the QR code */
  orderId: string;
  /** Optional pickup code to display below QR */
  pickupCode?: string | null;
  /** Size of the QR code in pixels (default: 200) */
  size?: number;
  /** Background color (default: white) */
  bgColor?: string;
  /** Foreground color (default: black) */
  fgColor?: string;
  /** Optional CSS class name */
  className?: string;
  /** Whether to show the pickup code below the QR */
  showPickupCode?: boolean;
}

/**
 * OrderQRCode - Displays a scannable QR code for order pickup
 * 
 * The QR code contains the order ID which staff can scan to
 * look up and verify the order for pickup.
 * 
 * @example
 * ```tsx
 * <OrderQRCode 
 *   orderId="123e4567-e89b-12d3-a456-426614174000"
 *   pickupCode="ABC123"
 *   showPickupCode
 * />
 * ```
 */
export const OrderQRCode = memo(function OrderQRCode({
  orderId,
  pickupCode,
  size = 200,
  bgColor = '#FFFFFF',
  fgColor = '#000000',
  className = '',
  showPickupCode = true,
}: OrderQRCodeProps) {
  const qrData = createOrderQRData(orderId);
  
  return (
    <div className={`flex flex-col items-center gap-4 ${className}`}>
      {/* QR Code */}
      <div 
        className="p-4 bg-white rounded-lg shadow-sm"
        style={{ backgroundColor: bgColor }}
      >
        <QRCode
          value={qrData}
          size={size}
          bgColor={bgColor}
          fgColor={fgColor}
          level="M" // Medium error correction
        />
      </div>
      
      {/* Pickup Code Display */}
      {showPickupCode && pickupCode && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-1">Pickup Code</p>
          <p className="text-2xl font-mono font-bold tracking-wider">
            {formatPickupCode(pickupCode)}
          </p>
        </div>
      )}
      
      {/* Instructions */}
      <p className="text-xs text-muted-foreground text-center max-w-[200px]">
        Show this QR code to staff when picking up your order
      </p>
    </div>
  );
});

export default OrderQRCode;
