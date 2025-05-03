import React, {
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
} from "react";
import Image from "next/image";

export interface SignaturePadRef {
  isEmpty: () => boolean;
  getSignatureFile: () => Promise<Blob | null>;
  clearSignature: () => void;
}

interface SignaturePadProps {
  existingSignature?: string | null;
}

const SignaturePad = forwardRef<SignaturePadRef, SignaturePadProps>(
  ({ existingSignature }, ref) => {
    const sigCanvas = useRef<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [hasDrawn, setHasDrawn] = useState(false);
    const [SignatureCanvas, setSignatureCanvas] = useState<any>(null);

    useEffect(() => {
      const loadSignatureCanvas = async () => {
        try {
          const { SignatureCanvas } = require("react-signature-canvas");
          setSignatureCanvas(() => SignatureCanvas);
        } catch (error) {
          console.error("Failed to load SignatureCanvas", error);
        }
      };

      loadSignatureCanvas();
    }, []);

    useImperativeHandle(ref, () => ({
      isEmpty: () => !hasDrawn && !existingSignature,
      getSignatureFile: async () => {
        if (!sigCanvas.current || (!hasDrawn && existingSignature)) return null;

        try {
          const trimmedCanvas = sigCanvas.current.getTrimmedCanvas();
          const MAX_DIMENSION = 2000;

          const { width, height } = trimmedCanvas;
          const scale = Math.min(1, MAX_DIMENSION / Math.max(width, height));

          let finalCanvas = trimmedCanvas;
          if (scale < 1) {
            const scaledCanvas = document.createElement("canvas");
            scaledCanvas.width = Math.floor(width * scale);
            scaledCanvas.height = Math.floor(height * scale);

            const ctx = scaledCanvas.getContext("2d");
            ctx?.drawImage(
              trimmedCanvas,
              0,
              0,
              scaledCanvas.width,
              scaledCanvas.height
            );

            finalCanvas = scaledCanvas;
          }

          const dataUrl = finalCanvas.toDataURL("image/png");
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], "signature.png", {
            type: "image/png",
            lastModified: Date.now(),
          });
          return file;
        } catch (error) {
          console.error("Error generating signature file:", error);
          return null;
        }
      },
      clearSignature: () => {
        sigCanvas.current?.clear();
        setHasDrawn(false);
      },
    }));

    return (
      <div className="mx-auto w-full max-w-lg">
        {existingSignature && !isEditing ? (
          <div className="relative">
            <Image
              src={existingSignature}
              alt="Saved Signature"
              width={300}
              height={100}
              className="h-48 w-full rounded-md border border-gray-300 object-contain"
              priority
            />
            <button
              onClick={() => setIsEditing(true)}
              className="absolute right-2 top-2 rounded bg-blue-500 px-4 py-2 text-white"
            >
              Edit Signature
            </button>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-gray-300">
            {SignatureCanvas && (
              <SignatureCanvas
                ref={sigCanvas}
                penColor="black"
                canvasProps={{ className: "w-full h-48" }}
                onBegin={() => setHasDrawn(true)}
              />
            )}
          </div>
        )}

        {(isEditing || (!existingSignature && hasDrawn)) && (
          <div className="mt-2 flex justify-between">
            <button
              className="rounded bg-red-500 px-4 py-2 text-white"
              onClick={() => {
                sigCanvas.current?.clear();
                setHasDrawn(false);
              }}
            >
              Clear
            </button>
            {isEditing && (
              <button
                className="rounded bg-gray-500 px-4 py-2 text-white"
                onClick={() => setIsEditing(false)}
              >
                Cancel Edit
              </button>
            )}
          </div>
        )}
      </div>
    );
  }
);

SignaturePad.displayName = "SignaturePad";
export default SignaturePad;
