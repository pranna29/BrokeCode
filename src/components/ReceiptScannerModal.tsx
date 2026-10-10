import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, Edit3, AlertTriangle, FileText, Loader2, RefreshCw } from 'lucide-react';
import { Category, PaymentAccount } from '../types.ts';
import { api } from '../services/api.ts';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  accounts: PaymentAccount[];
  onApproveAndOpenCalculator: (extracted: {
    amount?: number;
    merchant?: string;
    date?: string;
    categoryId?: string;
    description?: string;
  }) => void;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  categories,
  accounts,
  onApproveAndOpenCalculator
}) => {
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>('');
  const [useCamera, setUseCamera] = useState<boolean>(false);

  // Extracted details
  const [extractedData, setExtractedData] = useState<{
    amount?: number;
    merchant?: string;
    date?: string;
    categoryId?: string;
    description?: string;
    duplicateWarning?: boolean;
    confidenceNote?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  if (!isOpen) return null;

  // Handle local image file upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Please upload a valid JPG, PNG image or PDF document.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setFilePreview(dataUrl);
      await processImageForOCR(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Camera start / stop
  const startCamera = async () => {
    try {
      setUseCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Unable to access camera. Please upload an image file instead.');
      setUseCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setUseCamera(false);
  };

  const capturePhoto = async () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setFilePreview(dataUrl);
      stopCamera();
      await processImageForOCR(dataUrl);
    }
  };

  // OCR Processing
  const processImageForOCR = async (imageSrc: string) => {
    setIsProcessing(true);
    setProgressMsg('Scanning receipt text & detecting totals...');

    try {
      // Dynamic import of Tesseract to keep bundle light
      const Tesseract = await import('tesseract.js');
      const result = await Tesseract.recognize(imageSrc, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgressMsg(`Analyzing document (${Math.round((m.progress || 0) * 100)}%)...`);
          }
        }
      });

      const extractedText = result.data.text || '';
      setProgressMsg('Matching currency, merchant and duplicate checks...');

      // Send OCR text to heuristic parsing endpoint
      const parsed = await api.parseReceiptText(extractedText);

      // Match suggested category
      let matchedCatId = categories[0]?.id;
      if (parsed.suggestedCategory) {
        const found = categories.find((c) => c.id === parsed.suggestedCategory);
        if (found) matchedCatId = found.id;
      }

      setExtractedData({
        amount: parsed.amount,
        merchant: parsed.merchant,
        date: parsed.date,
        categoryId: matchedCatId,
        description: parsed.merchant ? `Receipt from ${parsed.merchant}` : 'Scanned receipt purchase',
        duplicateWarning: parsed.duplicateWarning,
        confidenceNote: parsed.amount ? 'Total extracted' : 'Amount uncertain, please review below'
      });
    } catch (err) {
      console.warn('Tesseract OCR error, falling back to manual entry:', err);
      // Graceful fallback allows user to input values without blocking
      setExtractedData({
        amount: undefined,
        merchant: undefined,
        date: new Date().toISOString().split('T')[0],
        categoryId: categories[0]?.id,
        description: 'Scanned receipt',
        confidenceNote: 'Could not automatically read text clearly. Please review details.'
      });
    } finally {
      setIsProcessing(false);
      setProgressMsg('');
    }
  };

  const handleReset = () => {
    stopCamera();
    setFilePreview(null);
    setExtractedData(null);
    setIsProcessing(false);
  };

  const handleClose = () => {
    stopCamera();
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-neutral-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#0B6121]/10 text-[#0B6121] flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#2B2B2B]">Scan Bill or Receipt</h3>
              <p className="text-[11px] text-neutral-500">Fast OCR extraction with mandatory user approval</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200/50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Step 1: Upload or Capture if no preview yet */}
          {!filePreview && !useCamera && (
            <div className="space-y-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-neutral-300 hover:border-[#0B6121] rounded-2xl p-8 text-center cursor-pointer transition-colors bg-neutral-50/50 hover:bg-neutral-50 flex flex-col items-center justify-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-neutral-100 group-hover:bg-[#0B6121]/10 text-neutral-500 group-hover:text-[#0B6121] flex items-center justify-center mb-3 transition-colors">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="text-sm font-semibold text-[#2B2B2B] block">
                  Upload Receipt Image or PDF
                </span>
                <span className="text-xs text-neutral-400 mt-1">
                  Supports JPG, PNG, and PDF receipts
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px bg-neutral-200 flex-1" />
                <span className="text-xs font-semibold uppercase text-neutral-400">or</span>
                <div className="h-px bg-neutral-200 flex-1" />
              </div>

              <button
                type="button"
                onClick={startCamera}
                className="w-full py-3 px-4 rounded-xl border border-neutral-300 hover:bg-neutral-50 font-semibold text-xs text-[#2B2B2B] flex items-center justify-center gap-2 transition-all"
              >
                <Camera className="w-4 h-4 text-[#0B6121]" />
                <span>Open Device Camera to Snap</span>
              </button>
            </div>
          )}

          {/* Active Camera View */}
          {useCamera && (
            <div className="space-y-3">
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-3/4 max-h-72 flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 py-3 rounded-xl bg-[#0B6121] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Snap Photo</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-3 rounded-xl border border-neutral-300 text-neutral-600 text-xs font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* OCR Processing Spinner */}
          {isProcessing && (
            <div className="p-8 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-[#0B6121] animate-spin mx-auto" />
              <p className="text-sm font-semibold text-[#2B2B2B]">{progressMsg}</p>
              <p className="text-xs text-neutral-400">Detecting subtotals, tax lines, and merchant</p>
            </div>
          )}

          {/* Preview & Mandatory Approval Flow */}
          {filePreview && !isProcessing && extractedData && (
            <div className="space-y-4">
              {/* Receipt Thumbnail & Confidence Banner */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                <img
                  src={filePreview}
                  alt="Receipt Preview"
                  className="w-14 h-14 object-cover rounded-lg border border-neutral-300 shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-[#2B2B2B] truncate">
                      {extractedData.merchant || 'Receipt Scanned'}
                    </span>
                  </div>
                  <span className="text-[11px] text-neutral-500 block truncate">
                    {extractedData.confidenceNote}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleReset}
                  className="text-xs text-neutral-400 hover:text-neutral-700 p-1"
                  title="Rescan"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Duplicate Receipt Alert if detected */}
              {extractedData.duplicateWarning && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong>Possible Duplicate:</strong> A transaction with this amount and merchant already exists recently. Please verify carefully.
                  </span>
                </div>
              )}

              {/* Extracted Details Card */}
              <div className="bg-[#FAF9F8] rounded-2xl p-4 border border-neutral-200 space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-neutral-200/60">
                  <span className="text-xs text-neutral-500 font-medium">Detected Amount</span>
                  <span className="text-base font-bold text-[#0B6121]">
                    {extractedData.amount !== undefined ? `$${extractedData.amount.toFixed(2)}` : 'Not detected'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-neutral-200/60">
                  <span className="text-xs text-neutral-500 font-medium">Merchant / Store</span>
                  <span className="text-xs font-semibold text-[#2B2B2B]">
                    {extractedData.merchant || 'Not identified'}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-neutral-200/60">
                  <span className="text-xs text-neutral-500 font-medium">Date</span>
                  <span className="text-xs font-semibold text-[#2B2B2B]">
                    {extractedData.date || new Date().toISOString().split('T')[0]}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-neutral-500 font-medium">Suggested Category</span>
                  <span className="text-xs font-semibold text-[#2B2B2B] flex items-center gap-1">
                    <span>{categories.find((c) => c.id === extractedData.categoryId)?.emoji}</span>
                    <span>{categories.find((c) => c.id === extractedData.categoryId)?.name || 'General'}</span>
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200/60 text-[11px] text-blue-900 leading-relaxed">
                ℹ️ <strong>Mandatory User Approval:</strong> Scanned receipts are never saved automatically. You can confirm or adjust the amount, category, and payment account in the next step.
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {filePreview && !isProcessing && extractedData && (
          <div className="p-4 bg-neutral-50 border-t border-neutral-100 flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-3 rounded-xl border border-neutral-300 text-neutral-600 font-semibold text-xs hover:bg-neutral-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onApproveAndOpenCalculator(extractedData);
                handleClose();
              }}
              className="flex-1 py-3 rounded-xl font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-sm transition-all"
              style={{ backgroundColor: '#0B6121' }}
            >
              <Check className="w-4 h-4" />
              <span>Confirm &amp; Review in Calculator</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
