import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import View from "../view-manager/View";
import useViewStore from "../view-manager/view-manager-store";
import { useTabletStore } from "../store";

const TARGET_QR_CODE = "https://qrto.org/SR52SJ";

export function CameraPreview() {
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef<boolean>(false);
  const isProcessingRef = useRef<boolean>(false);
  const setView = useViewStore((state) => state.setView);
  const currentView = useViewStore((state) => state.currentView);
  const resetTablet = useTabletStore((state) => state.reset);

  // Initialize QR scanner when view becomes active
  useEffect(() => {
    const startQrScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("qr-reader");
        qrScannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 400, height: 400 },
          },
          (decodedText) => {
            // QR code detected
            console.log("[CAMERA-PREVIEW] QR Code scanned:", decodedText);
            
            // Prevent processing multiple times
            if (isProcessingRef.current) {
              console.log("[CAMERA-PREVIEW] Already processing, ignoring scan");
              return;
            }
            
            if (decodedText === TARGET_QR_CODE) {
              console.log("[CAMERA-PREVIEW] Correct QR code detected, proceeding to next view");
              isProcessingRef.current = true;
              
              // Stop scanner before changing view
              if (isScanningRef.current) {
                html5QrCode.stop().then(() => {
                  isScanningRef.current = false;
                  setView("message-select");
                }).catch(err => {
                  console.error("[CAMERA-PREVIEW] Error stopping scanner:", err);
                  isScanningRef.current = false;
                  setView("message-select");
                });
              } else {
                setView("message-select");
              }
            } else {
              console.log("[CAMERA-PREVIEW] QR code does not match target");
            }
          },
          () => {
            // QR code parsing error (happens frequently, can be ignored)
            // console.log("[CAMERA-PREVIEW] QR scan error:", errorMessage);
          }
        );

        isScanningRef.current = true;
        console.log("[CAMERA-PREVIEW] QR Scanner started successfully");
      } catch (error) {
        console.error("[CAMERA-PREVIEW] Error starting QR scanner:", error);
      }
    };

    if (currentView === "camera-preview") {
      console.log("[CAMERA-PREVIEW] View active, starting QR scanner");
      isProcessingRef.current = false; // Reset processing flag
      startQrScanner();
    }

    return () => {
      // Clean up QR scanner when leaving view
      if (qrScannerRef.current && isScanningRef.current) {
        console.log("[CAMERA-PREVIEW] Stopping QR scanner");
        qrScannerRef.current
          .stop()
          .then(() => {
            console.log("[CAMERA-PREVIEW] QR scanner stopped");
            isScanningRef.current = false;
          })
          .catch((err) => {
            console.error("[CAMERA-PREVIEW] Error stopping QR scanner:", err);
            isScanningRef.current = false;
          });
      }
    };
  }, [currentView, setView]);



  useEffect(() => {
    if (currentView === "camera-preview") {
      resetTablet();
    }
  }, [currentView, resetTablet]);

  return (
    <View viewId="camera-preview">
      <div
        className="w-full h-full bg-cover bg-center"
        style={{ backgroundImage: "url(/images/fb_bg1.png)" }}
      >
        {/* Camera preview with QR scanner in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[500px] h-[500px] rounded-[60px] overflow-hidden border-8 border-white shadow-2xl">
            <div id="qr-reader" className="w-full h-full"></div>
          </div>
        </div>
      </div>
    </View>
  );
}
