import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  X,
  Check,
  AlertTriangle,
  FileText,
  Loader2,
  Eye,
  ShieldCheck,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ICategory, IExpense } from '../types';

interface ReceiptScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmReceipt: (data: {
    amount: number;
    merchant: string;
    category: string;
    description: string;
    date: string;
    currency: string;
  }) => void;
  categories: ICategory[];
  recentExpenses?: IExpense[];
  currencySymbol?: string;
}

interface ExtractedData {
  amount: number;
  merchant: string;
  category: string;
  description: string;
  date: string;
  currency: string;
  confidence: 'high' | 'medium' | 'low';
  rawText: string;
}

export const ReceiptScannerModal: React.FC<ReceiptScannerModalProps> = ({
  isOpen,
  onClose,
  onConfirmReceipt,
  categories,
  recentExpenses = [],
  currencySymbol = '₹',
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Extracted fields for manual review
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [reviewAmount, setReviewAmount] = useState<string>('');
  const [reviewMerchant, setReviewMerchant] = useState<string>('');
  const [reviewCategory, setReviewCategory] = useState<string>('');
  const [reviewDescription, setReviewDescription] = useState<string>('');
  const [reviewDate, setReviewDate] = useState<string>('');

  // Duplicate warning detection
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setIsProcessing(false);
    setProgressStatus('');
    setProgressPercent(0);
    setError(null);
    setExtractedData(null);
    setDuplicateWarning(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileSelected = async (selectedFile: File) => {
    setError(null);
    setDuplicateWarning(null);

    // Validate size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit. Please upload a smaller receipt image.');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError('Unsupported file type. Please upload a JPG, PNG, or PDF receipt.');
      return;
    }

    setFile(selectedFile);
    const objectUrl = URL.createObjectURL(selectedFile);
    setPreviewUrl(objectUrl);

    // If PDF, provide immediate fallback manual review
    if (selectedFile.type === 'application/pdf') {
      const today = new Date().toISOString().slice(0, 10);
      setExtractedData({
        amount: 0,
        merchant: 'PDF Receipt',
        category: categories[0]?.name || 'Bills & Utilities',
        description: selectedFile.name.replace('.pdf', ''),
        date: today,
        currency: 'INR',
        confidence: 'low',
        rawText: 'PDF uploaded for manual verification.',
      });
      setReviewAmount('0');
      setReviewMerchant('PDF Receipt');
      setReviewCategory(categories[0]?.name || 'Bills & Utilities');
      setReviewDescription(selectedFile.name.replace('.pdf', ''));
      setReviewDate(today);
      return;
    }

    // Process Image with Tesseract.js
    await processReceiptOcr(selectedFile);
  };

  const processReceiptOcr = async (imageFile: File) => {
    setIsProcessing(true);
    setProgressStatus('Initializing OCR engine...');
    setProgressPercent(10);

    try {
      // Dynamically import tesseract to optimize initial bundle size
      const Tesseract = await import('tesseract.js');
      
      setProgressStatus('Analyzing receipt text & amounts...');
      setProgressPercent(40);

      const result = await Tesseract.recognize(imageFile, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text' && m.progress) {
            setProgressStatus(`Reading receipt characters (${Math.round(m.progress * 100)}%)...`);
            setProgressPercent(40 + Math.round(m.progress * 50));
          }
        },
      });

      const text = result.data.text || '';
      setProgressPercent(95);
      setProgressStatus('Extracting amounts, store name, and date...');

      parseReceiptText(text);
    } catch (err: any) {
      console.error('OCR processing error:', err);
      setError('Could not automatically parse text from receipt. You can manually enter the details below.');
      // Graceful fallback to manual entry
      const today = new Date().toISOString().slice(0, 10);
      setExtractedData({
        amount: 0,
        merchant: 'Scanned Receipt',
        category: categories[0]?.name || 'Food & Dining',
        description: 'Receipt Scan',
        date: today,
        currency: 'INR',
        confidence: 'low',
        rawText: '',
      });
      setReviewAmount('0');
      setReviewMerchant('Scanned Receipt');
      setReviewCategory(categories[0]?.name || 'Food & Dining');
      setReviewDescription('Receipt Scan');
      setReviewDate(today);
    } finally {
      setIsProcessing(false);
    }
  };

  const parseReceiptText = (rawText: string) => {
    const lines = rawText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    // 1. EXTRACT AMOUNT
    let detectedAmount = 0;
    let confidence: 'high' | 'medium' | 'low' = 'low';

    // Regex for amounts (supports standard commas, dots, currency symbols)
    const amountRegex = /(?:total|amount\s+due|balance\s+due|grand\s+total|net\s+amount|bill\s+amount|paid|total\s+rs|total\s+inr|subtotal)[\s:=-]+(?:[₹$€£]\s*)?([0-9]+(?:[.,][0-9]{2})?)/i;

    // Check line by line for explicit total lines first
    for (const line of lines) {
      const match = line.match(amountRegex);
      if (match && match[1]) {
        const val = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(val) && val > 0) {
          detectedAmount = val;
          confidence = 'high';
          break;
        }
      }
    }

    // Fallback: look for lines ending in currency/number if explicit keyword wasn't found
    if (detectedAmount === 0) {
      const numericCandidates: number[] = [];
      const genericAmountRegex = /(?:[₹$€£]\s*)?([0-9]+\.[0-9]{2})\b/g;
      for (const line of lines) {
        // Skip lines that look like tax percentages, quantities, or phone numbers
        if (line.toLowerCase().includes('%') || line.length > 30) continue;
        let match;
        while ((match = genericAmountRegex.exec(line)) !== null) {
          const num = parseFloat(match[1]);
          if (!isNaN(num) && num > 0 && num < 1000000) {
            numericCandidates.push(num);
          }
        }
      }
      if (numericCandidates.length > 0) {
        // Find maximum reasonable amount (often the total at bottom of receipt)
        detectedAmount = Math.max(...numericCandidates);
        confidence = 'medium';
      }
    }

    // 2. EXTRACT MERCHANT
    let detectedMerchant = '';
    // Typically the store name is within the first 3 lines
    for (let i = 0; i < Math.min(4, lines.length); i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      // Skip generic headers
      if (
        lower.includes('tax invoice') ||
        lower.includes('receipt') ||
        lower.includes('bill') ||
        lower.includes('welcome') ||
        lower.includes('cash memo') ||
        lower.includes('retail') ||
        lower.includes('order') ||
        lower.length < 3
      ) {
        continue;
      }
      detectedMerchant = line.replace(/[^a-zA-Z0-9 &',.-]/g, '').trim();
      if (detectedMerchant.length > 2) break;
    }
    if (!detectedMerchant) detectedMerchant = 'Store / Merchant';

    // 3. EXTRACT DATE
    let detectedDate = new Date().toISOString().slice(0, 10);
    const dateRegex1 = /\b(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})\b/; // DD/MM/YYYY or MM/DD/YYYY
    const dateRegex2 = /\b(\d{4})[/-](\d{1,2})[/-](\d{1,2})\b/; // YYYY-MM-DD
    const dateRegex3 = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})\b/i;

    for (const line of lines) {
      const match2 = line.match(dateRegex2);
      if (match2) {
        detectedDate = `${match2[1]}-${match2[2].padStart(2, '0')}-${match2[3].padStart(2, '0')}`;
        break;
      }
      const match1 = line.match(dateRegex1);
      if (match1) {
        let y = match1[3];
        if (y.length === 2) y = '20' + y;
        // Assume DD/MM/YYYY
        detectedDate = `${y}-${match1[2].padStart(2, '0')}-${match1[1].padStart(2, '0')}`;
        break;
      }
      const match3 = line.match(dateRegex3);
      if (match3) {
        const d = new Date(match3[0]);
        if (!isNaN(d.getTime())) {
          detectedDate = d.toISOString().slice(0, 10);
          break;
        }
      }
    }

    // 4. CATEGORY PREDICTION
    const lowerText = rawText.toLowerCase();
    let detectedCategory = categories[0]?.name || 'Food & Dining';

    if (
      lowerText.includes('supermarket') ||
      lowerText.includes('grocery') ||
      lowerText.includes('market') ||
      lowerText.includes('mart') ||
      lowerText.includes('vegetables')
    ) {
      detectedCategory = 'Groceries';
    } else if (
      lowerText.includes('restaurant') ||
      lowerText.includes('cafe') ||
      lowerText.includes('coffee') ||
      lowerText.includes('dining') ||
      lowerText.includes('burger') ||
      lowerText.includes('pizza') ||
      lowerText.includes('food')
    ) {
      detectedCategory = 'Food & Dining';
    } else if (
      lowerText.includes('uber') ||
      lowerText.includes('ola') ||
      lowerText.includes('fuel') ||
      lowerText.includes('petrol') ||
      lowerText.includes('transit') ||
      lowerText.includes('metro')
    ) {
      detectedCategory = 'Transport';
    } else if (
      lowerText.includes('pharmacy') ||
      lowerText.includes('medical') ||
      lowerText.includes('chemist') ||
      lowerText.includes('hospital') ||
      lowerText.includes('dr.')
    ) {
      detectedCategory = 'Healthcare';
    } else if (
      lowerText.includes('electricity') ||
      lowerText.includes('water') ||
      lowerText.includes('bill') ||
      lowerText.includes('broadband') ||
      lowerText.includes('telecom')
    ) {
      detectedCategory = 'Bills & Utilities';
    } else if (
      lowerText.includes('apparel') ||
      lowerText.includes('fashion') ||
      lowerText.includes('mall') ||
      lowerText.includes('clothing')
    ) {
      detectedCategory = 'Shopping';
    }

    // 5. DUPLICATE CHECK
    if (detectedAmount > 0 && recentExpenses.length > 0) {
      const foundDup = recentExpenses.find(
        (e) =>
          Math.abs(e.amount - detectedAmount) < 0.01 &&
          (e.merchant?.toLowerCase() === detectedMerchant.toLowerCase() ||
            new Date(e.date).toISOString().slice(0, 10) === detectedDate)
      );
      if (foundDup) {
        setDuplicateWarning(
          `A similar expense of ${currencySymbol}${detectedAmount.toFixed(2)} at "${foundDup.merchant}" on ${new Date(
            foundDup.date
          ).toLocaleDateString()} was previously recorded.`
        );
      }
    }

    const finalData: ExtractedData = {
      amount: detectedAmount,
      merchant: detectedMerchant,
      category: detectedCategory,
      description: `Receipt from ${detectedMerchant}`,
      date: detectedDate,
      currency: 'INR',
      confidence,
      rawText,
    };

    setExtractedData(finalData);
    setReviewAmount(detectedAmount > 0 ? String(detectedAmount) : '0');
    setReviewMerchant(detectedMerchant);
    setReviewCategory(detectedCategory);
    setReviewDescription(`Receipt from ${detectedMerchant}`);
    setReviewDate(detectedDate);
  };

  const handleConfirmAndProceed = () => {
    const parsedAmount = parseFloat(reviewAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please provide a valid amount greater than zero.');
      return;
    }

    onConfirmReceipt({
      amount: Math.round(parsedAmount * 100) / 100,
      merchant: reviewMerchant.trim() || reviewCategory.trim(),
      category: reviewCategory.trim(),
      description: reviewDescription.trim(),
      date: reviewDate,
      currency: 'INR',
    });

    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-[#faf9f8] dark:bg-slate-900 border border-[#E0DDDA] dark:border-slate-800 shadow-2xl p-5 sm:p-6 text-xs flex flex-col max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E0DDDA] dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#0B6121]/10 text-[#0B6121]">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-sm font-extrabold text-[#2B2B2B] dark:text-white">
                Scan Bill or Receipt (OCR)
              </h2>
              <p className="text-[10px] text-slate-500">
                Snap or upload a receipt to automatically extract amount, store & category.
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-3 flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Duplicate warning */}
        {duplicateWarning && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong className="block font-bold">Possible Duplicate Detected:</strong>
              {duplicateWarning}
            </div>
          </div>
        )}

        {/* Upload Selection Zone (when no file is active) */}
        {!file && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Camera Capture */}
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-[#0B6121]/40 hover:border-[#0B6121] bg-white dark:bg-slate-800/60 hover:bg-[#0B6121]/5 text-slate-700 dark:text-slate-200 transition group cursor-pointer"
              >
                <div className="h-12 w-12 rounded-2xl bg-[#0B6121]/10 flex items-center justify-center text-[#0B6121] mb-2 group-hover:scale-110 transition-transform">
                  <Camera className="w-6 h-6" />
                </div>
                <span className="font-extrabold text-xs text-[#2B2B2B] dark:text-white">
                  Take Photograph
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  Direct camera capture
                </span>
              </button>

              {/* Upload File */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-[#E0DDDA] dark:border-slate-700 hover:border-[#0B6121] bg-white dark:bg-slate-800/60 hover:bg-[#0B6121]/5 text-slate-700 dark:text-slate-200 transition group cursor-pointer"
              >
                <div className="h-12 w-12 rounded-2xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-2 group-hover:scale-110 transition-transform">
                  <Upload className="w-6 h-6" />
                </div>
                <span className="font-extrabold text-xs text-[#2B2B2B] dark:text-white">
                  Upload Receipt
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  JPG, PNG, or PDF file (max 10MB)
                </span>
              </button>
            </div>

            {/* Hidden Inputs */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelected(e.target.files[0]);
                }
              }}
            />

            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/60 text-[10px] text-slate-500">
              <ShieldCheck className="w-4 h-4 text-[#0B6121] shrink-0" />
              <span>
                Privacy Protected: Bill scanning executes securely. Receipt files are never stored permanently without explicit confirmation.
              </span>
            </div>
          </div>
        )}

        {/* OCR Processing State */}
        {isProcessing && (
          <div className="my-8 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#0B6121]" />
            <span className="font-bold text-xs text-[#2B2B2B] dark:text-white">
              {progressStatus}
            </span>
            <div className="w-48 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0B6121] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400">
              Extracting line items, merchant headers & total bill amounts...
            </span>
          </div>
        )}

        {/* Extracted Details & Mandatory Approval Flow */}
        {file && !isProcessing && extractedData && (
          <div className="mt-4 space-y-4">
            {/* Receipt Preview Thumbnail */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-800 border border-[#E0DDDA] dark:border-slate-700">
              <div className="flex items-center gap-3">
                {previewUrl && file.type.startsWith('image/') ? (
                  <img
                    src={previewUrl}
                    alt="Receipt thumbnail"
                    className="w-12 h-14 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                ) : (
                  <div className="w-12 h-14 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400">
                    <FileText className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <span className="font-bold text-xs text-[#2B2B2B] dark:text-white block truncate max-w-[200px]">
                    {file.name}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {(file.size / 1024).toFixed(1)} KB • OCR Confidence:{' '}
                    <strong className="capitalize text-[#0B6121]">{extractedData.confidence}</strong>
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={resetState}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-rose-600 transition"
                title="Change or re-scan image"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-scan</span>
              </button>
            </div>

            {/* Editable Extracted Fields (Mandatory User Review) */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-[#E0DDDA] dark:border-slate-700 space-y-3">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                Extracted Receipt Data (Review & Correct)
              </span>

              {/* Amount */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                  Total Amount Payable ({currencySymbol}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={reviewAmount}
                  onChange={(e) => setReviewAmount(e.target.value)}
                  className="w-full text-lg font-black rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-[#faf9f8] dark:bg-slate-900 px-3 py-2 text-[#2B2B2B] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0B6121]"
                />
              </div>

              {/* Merchant / Store */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Merchant / Store Name
                  </label>
                  <input
                    type="text"
                    value={reviewMerchant}
                    onChange={(e) => setReviewMerchant(e.target.value)}
                    placeholder="e.g. Trader Joe's, Starbucks"
                    className="w-full rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-[#faf9f8] dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-[#2B2B2B] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0B6121]"
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Suggested Category
                  </label>
                  <select
                    value={reviewCategory}
                    onChange={(e) => setReviewCategory(e.target.value)}
                    className="w-full rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-[#faf9f8] dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-[#2B2B2B] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0B6121]"
                  >
                    {categories.map((c) => (
                      <option key={c._id} value={c.name}>
                        {c.emoji || '🏷️'} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Description / Note
                  </label>
                  <input
                    type="text"
                    value={reviewDescription}
                    onChange={(e) => setReviewDescription(e.target.value)}
                    className="w-full rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-[#faf9f8] dark:bg-slate-900 px-3 py-2 text-xs text-[#2B2B2B] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0B6121]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase mb-1">
                    Receipt Date
                  </label>
                  <input
                    type="date"
                    value={reviewDate}
                    onChange={(e) => setReviewDate(e.target.value)}
                    className="w-full rounded-xl border border-[#E0DDDA] dark:border-slate-700 bg-[#faf9f8] dark:bg-slate-900 px-3 py-2 text-xs text-[#2B2B2B] dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#0B6121]"
                  />
                </div>
              </div>
            </div>

            {/* Approval Flow Actions */}
            <div className="pt-2 flex flex-col sm:flex-row items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-1/3 py-2.5 px-4 rounded-xl border border-[#E0DDDA] dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold transition text-xs text-center cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAndProceed}
                className="w-full sm:w-2/3 py-2.5 px-4 rounded-xl bg-[#0B6121] hover:bg-[#094e1a] text-white font-extrabold text-xs shadow-md shadow-[#0B6121]/30 transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirm & Open Calculator</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
