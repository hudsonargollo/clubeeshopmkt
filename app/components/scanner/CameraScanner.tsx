import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

/**
 * Supported barcode formats for the camera scanner
 * Requirements 3.4: Support UPC, EAN, Code128, and QR code formats
 */
export type BarcodeFormat = 
  | 'upc_a'
  | 'upc_e'
  | 'ean_13'
  | 'ean_8'
  | 'code_128'
  | 'qr_code';

/**
 * Props for the CameraScanner component
 */
export interface CameraScannerProps {
  /** Callback invoked when a barcode is successfully scanned */
  onScan: (code: string) => void;
  /** Barcode formats to detect (default: all supported formats) */
  formats?: BarcodeFormat[];
  /** Whether the scanner is enabled */
  enabled?: boolean;
  /** Optional CSS class name for the container */
  className?: string;
  /** Width of the scanner viewport in pixels */
  width?: number;
  /** Height of the scanner viewport in pixels */
  height?: number;
  /** Frames per second for scanning (default: 10) */
  fps?: number;
  /** Size of the QR box as a ratio of the viewport (default: 0.7) */
  qrboxRatio?: number;
}

/**
 * Scanner state for UI feedback
 */
export interface ScannerState {
  isInitializing: boolean;
  isScanning: boolean;
  error: string | null;
  hasNativeSupport: boolean;
}

/**
 * Map our format names to html5-qrcode format constants
 */
const FORMAT_MAP: Record<BarcodeFormat, Html5QrcodeSupportedFormats> = {
  upc_a: Html5QrcodeSupportedFormats.UPC_A,
  upc_e: Html5QrcodeSupportedFormats.UPC_E,
  ean_13: Html5QrcodeSupportedFormats.EAN_13,
  ean_8: Html5QrcodeSupportedFormats.EAN_8,
  code_128: Html5QrcodeSupportedFormats.CODE_128,
  qr_code: Html5QrcodeSupportedFormats.QR_CODE,
};

/**
 * Default formats to scan
 */
const DEFAULT_FORMATS: BarcodeFormat[] = [
  'upc_a',
  'upc_e', 
  'ean_13',
  'ean_8',
  'code_128',
  'qr_code',
];


/**
 * Check if the native BarcodeDetector API is available
 * Requirement 3.1: Feature detect BarcodeDetector API
 */
function hasNativeBarcodeDetector(): boolean {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

/**
 * Map our format names to native BarcodeDetector format names
 */
const NATIVE_FORMAT_MAP: Record<BarcodeFormat, string> = {
  upc_a: 'upc_a',
  upc_e: 'upc_e',
  ean_13: 'ean_13',
  ean_8: 'ean_8',
  code_128: 'code_128',
  qr_code: 'qr_code',
};

/**
 * CameraScanner - React component for camera-based barcode scanning
 * 
 * This component provides mobile camera fallback for barcode scanning when
 * USB hardware scanners are not available. It uses the native BarcodeDetector
 * API when available, falling back to html5-qrcode WebAssembly library.
 * 
 * Requirements implemented:
 * - 3.1: Use native BarcodeDetector API when available
 * - 3.2: Fall back to html5-qrcode when BarcodeDetector unavailable
 * - 3.3: Invoke same handleItemScan function as USB scanner (via onScan prop)
 * - 3.4: Support UPC, EAN, Code128, and QR code formats
 * 
 * @param props - Component props
 */
export function CameraScanner({
  onScan,
  formats = DEFAULT_FORMATS,
  enabled = true,
  className = '',
  width = 300,
  height = 300,
  fps = 10,
  qrboxRatio = 0.7,
}: CameraScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const nativeDetectorRef = useRef<BarcodeDetector | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastScannedRef = useRef<string>('');
  const scanCooldownRef = useRef<number>(0);

  const [state, setState] = useState<ScannerState>({
    isInitializing: false,
    isScanning: false,
    error: null,
    hasNativeSupport: false,
  });

  // Generate unique ID for the scanner element
  const scannerId = useRef(`camera-scanner-${Math.random().toString(36).slice(2, 11)}`);


  /**
   * Handle successful barcode detection
   * Implements debouncing to prevent duplicate scans
   */
  const handleScanSuccess = useCallback((decodedText: string) => {
    const now = Date.now();
    
    // Debounce: ignore same code within 2 seconds
    if (decodedText === lastScannedRef.current && now - scanCooldownRef.current < 2000) {
      return;
    }

    lastScannedRef.current = decodedText;
    scanCooldownRef.current = now;
    
    // Requirement 3.3: Invoke the same handler as USB scanner
    onScan(decodedText);
  }, [onScan]);

  /**
   * Initialize native BarcodeDetector scanning
   * Requirement 3.1: Use native hardware-accelerated scanning
   */
  const initNativeScanner = useCallback(async () => {
    if (!hasNativeBarcodeDetector()) {
      return false;
    }

    try {
      // Get supported formats from the native API
      const supportedFormats = await (window as any).BarcodeDetector.getSupportedFormats();
      const requestedFormats = formats
        .map(f => NATIVE_FORMAT_MAP[f])
        .filter(f => supportedFormats.includes(f));

      if (requestedFormats.length === 0) {
        return false;
      }

      // Create native detector
      nativeDetectorRef.current = new (window as any).BarcodeDetector({
        formats: requestedFormats,
      });

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      // Create video element for native scanning
      const video = document.createElement('video');
      video.srcObject = stream;
      video.setAttribute('playsinline', 'true');
      video.style.width = `${width}px`;
      video.style.height = `${height}px`;
      video.style.objectFit = 'cover';
      video.style.borderRadius = '8px';
      
      await video.play();
      videoRef.current = video;

      // Append video to container
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
        containerRef.current.appendChild(video);
      }

      // Start detection loop
      const detectLoop = async () => {
        if (!nativeDetectorRef.current || !videoRef.current || !enabled) {
          return;
        }

        try {
          const barcodes = await nativeDetectorRef.current.detect(videoRef.current);
          if (barcodes.length > 0) {
            handleScanSuccess(barcodes[0].rawValue);
          }
        } catch (err) {
          // Ignore detection errors, continue scanning
        }

        animationFrameRef.current = requestAnimationFrame(detectLoop);
      };

      detectLoop();
      return true;
    } catch (err) {
      console.warn('Native BarcodeDetector initialization failed:', err);
      return false;
    }
  }, [formats, width, height, enabled, handleScanSuccess]);


  /**
   * Initialize html5-qrcode fallback scanner
   * Requirement 3.2: Fall back to html5-qrcode WebAssembly library
   */
  const initFallbackScanner = useCallback(async () => {
    try {
      // Convert formats to html5-qrcode format constants
      const html5Formats = formats.map(f => FORMAT_MAP[f]);

      // Create scanner instance
      const html5Qrcode = new Html5Qrcode(scannerId.current, {
        formatsToSupport: html5Formats,
        verbose: false,
      });

      html5QrcodeRef.current = html5Qrcode;

      // Calculate QR box size
      const qrboxSize = Math.min(width, height) * qrboxRatio;

      // Start scanning
      await html5Qrcode.start(
        { facingMode: 'environment' },
        {
          fps,
          qrbox: { width: qrboxSize, height: qrboxSize },
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {
          // Ignore scan failures (no barcode in frame)
        }
      );

      return true;
    } catch (err) {
      console.error('html5-qrcode initialization failed:', err);
      throw err;
    }
  }, [formats, width, height, fps, qrboxRatio, handleScanSuccess]);

  /**
   * Stop all scanning and clean up resources
   */
  const stopScanning = useCallback(async () => {
    // Stop animation frame loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop native video stream
    if (videoRef.current) {
      const stream = videoRef.current.srcObject as MediaStream;
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      videoRef.current = null;
    }

    // Stop html5-qrcode
    if (html5QrcodeRef.current) {
      try {
        const state = html5QrcodeRef.current.getState();
        if (state === 2) { // Html5QrcodeScannerState.SCANNING
          await html5QrcodeRef.current.stop();
        }
      } catch (err) {
        // Ignore stop errors
      }
      html5QrcodeRef.current = null;
    }

    // Clear native detector
    nativeDetectorRef.current = null;

    setState(prev => ({
      ...prev,
      isScanning: false,
    }));
  }, []);


  /**
   * Initialize scanner on mount or when enabled changes
   */
  useEffect(() => {
    if (!enabled) {
      stopScanning();
      return;
    }

    let mounted = true;

    const initScanner = async () => {
      setState(prev => ({
        ...prev,
        isInitializing: true,
        error: null,
      }));

      try {
        // Requirement 3.1: Try native BarcodeDetector first
        const hasNative = hasNativeBarcodeDetector();
        setState(prev => ({ ...prev, hasNativeSupport: hasNative }));

        let success = false;

        if (hasNative) {
          success = await initNativeScanner();
        }

        // Requirement 3.2: Fall back to html5-qrcode if native fails
        if (!success && mounted) {
          await initFallbackScanner();
        }

        if (mounted) {
          setState(prev => ({
            ...prev,
            isInitializing: false,
            isScanning: true,
          }));
        }
      } catch (err) {
        if (mounted) {
          setState(prev => ({
            ...prev,
            isInitializing: false,
            isScanning: false,
            error: err instanceof Error ? err.message : 'Failed to initialize camera scanner',
          }));
        }
      }
    };

    initScanner();

    return () => {
      mounted = false;
      stopScanning();
    };
  }, [enabled, initNativeScanner, initFallbackScanner, stopScanning]);

  /**
   * Clean up on unmount
   */
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, [stopScanning]);

  return (
    <div 
      className={`camera-scanner ${className}`}
      style={{ 
        width, 
        height,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: '8px',
        backgroundColor: '#000',
      }}
    >
      {/* Scanner container - used by html5-qrcode or native video */}
      <div 
        id={scannerId.current}
        ref={containerRef}
        style={{ 
          width: '100%', 
          height: '100%',
        }}
      />

      {/* Loading overlay */}
      {state.isInitializing && (
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div className="animate-spin" style={{ 
              width: 32, 
              height: 32, 
              border: '3px solid rgba(255,255,255,0.3)',
              borderTopColor: 'white',
              borderRadius: '50%',
              margin: '0 auto 8px',
            }} />
            <span>Initializing camera...</span>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {state.error && (
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            padding: 16,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: 8, fontSize: 24 }}>⚠️</div>
            <span>{state.error}</span>
          </div>
        </div>
      )}

      {/* Native support indicator (for debugging) */}
      {state.isScanning && (
        <div 
          style={{
            position: 'absolute',
            bottom: 8,
            left: 8,
            fontSize: 10,
            color: 'rgba(255, 255, 255, 0.6)',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            padding: '2px 6px',
            borderRadius: 4,
          }}
        >
          {state.hasNativeSupport ? 'Native API' : 'html5-qrcode'}
        </div>
      )}
    </div>
  );
}

export default CameraScanner;

// Type declaration for native BarcodeDetector API
declare global {
  interface Window {
    BarcodeDetector?: {
      new (options?: { formats: string[] }): BarcodeDetector;
      getSupportedFormats(): Promise<string[]>;
    };
  }

  interface BarcodeDetector {
    detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
  }

  interface DetectedBarcode {
    boundingBox: DOMRectReadOnly;
    cornerPoints: { x: number; y: number }[];
    format: string;
    rawValue: string;
  }
}
