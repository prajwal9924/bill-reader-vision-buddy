
import { useState } from 'react';
import * as Tesseract from 'tesseract.js';

interface BillData {
  fullText: string;
  date?: string;
  total?: string;
  merchant?: string;
}

export function useOCR() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BillData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processImage = async (imageFile: File | string): Promise<void> => {
    try {
      setIsProcessing(true);
      setProgress(0);
      setError(null);
      
      const worker = await Tesseract.createWorker('eng');
      
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$,.:/\\- ',
      });
      
      const ret = await worker.recognize(imageFile, {
        progress: (p) => {
          setProgress(p.progress * 100);
        },
      });
      
      await worker.terminate();
      
      const text = ret.data.text;
      
      // Parse the bill data
      const billData: BillData = {
        fullText: text,
        date: extractDate(text),
        total: extractTotal(text),
        merchant: extractMerchant(text),
      };
      
      setResult(billData);
    } catch (err) {
      console.error('OCR processing error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Simple date extraction - looks for common date formats
  const extractDate = (text: string): string | undefined => {
    // Match common date formats like MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD
    const dateRegex = /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/g;
    const matches = text.match(dateRegex);
    return matches ? matches[0] : undefined;
  };

  // Extract total amount
  const extractTotal = (text: string): string | undefined => {
    // Look for patterns like "Total: $XX.XX" or "Amount Due: $XX.XX"
    const totalRegex = /(?:total|amount|due|balance|sum)(?:\s*:)?\s*\$?\s*(\d+[.,]\d{2})/i;
    const match = text.match(totalRegex);
    return match ? match[1] : undefined;
  };

  // Try to extract merchant name
  const extractMerchant = (text: string): string | undefined => {
    // First few lines often contain the merchant name
    const lines = text.split('\n').slice(0, 5);
    // Filter out lines that look like dates, amounts, or are too short
    const potentialMerchants = lines.filter(line => 
      line.length > 3 && 
      !line.match(/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/) && 
      !line.match(/\$\d+\.\d{2}/)
    );
    
    return potentialMerchants.length > 0 ? potentialMerchants[0].trim() : undefined;
  };

  return {
    processImage,
    isProcessing,
    progress,
    result,
    error,
  };
}
