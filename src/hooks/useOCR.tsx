
import { useState } from 'react';
import * as Tesseract from 'tesseract.js';

interface BillData {
  fullText: string;
  date?: string;
  total?: string;
  merchant?: string;
}

// Image preprocessing helpers
const preprocessImage = async (imageFile: File | string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Create canvas for image manipulation
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        URL.revokeObjectURL(img.src);
        reject(new Error('Could not get canvas context'));
        return;
      }
      
      // Set canvas dimensions
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get image data for processing
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Apply contrast enhancement and binarization
      const threshold = 150;
      for (let i = 0; i < data.length; i += 4) {
        // Convert to grayscale with weighted RGB
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        // Apply threshold for black and white
        const value = gray > threshold ? 255 : 0;
        
        // Set RGB to the same value for B&W
        data[i] = value;     // R
        data[i + 1] = value; // G
        data[i + 2] = value; // B
      }
      
      // Put processed data back on canvas
      ctx.putImageData(imageData, 0, 0);
      
      // Convert to data URL
      const processedImageUrl = canvas.toDataURL('image/png');
      URL.revokeObjectURL(img.src);
      resolve(processedImageUrl);
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for preprocessing'));
    };
    
    // Set image source from file or string
    if (typeof imageFile === 'string') {
      img.src = imageFile;
    } else {
      img.src = URL.createObjectURL(imageFile);
    }
  });
};

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
      
      // Preprocess the image to improve OCR accuracy
      console.log("Preprocessing image...");
      const processedImage = await preprocessImage(imageFile);
      
      console.log("Creating Tesseract worker...");
      const worker = await Tesseract.createWorker({
        logger: m => {
          if (m.status === 'recognizing text') {
            setProgress(m.progress * 100);
          }
        }
      });
      
      // Load English language data
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      
      // Configure Tesseract for receipt recognition
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$,.:/\\-& ',
        tessedit_pageseg_mode: '6', // Assume a single uniform block of text
        preserve_interword_spaces: '1',
        tessedit_ocr_engine_mode: '2', // Use LSTM only
      });
      
      console.log("Running OCR on preprocessed image...");
      const ret = await worker.recognize(processedImage);
      
      await worker.terminate();
      
      const text = ret.data.text;
      console.log("OCR completed. Raw text:", text.substring(0, 100) + "...");
      
      // Parse the bill data with improved extractors
      const billData: BillData = {
        fullText: text,
        date: extractDate(text),
        total: extractTotal(text),
        merchant: extractMerchant(text),
      };
      
      console.log("Extracted data:", billData);
      setResult(billData);
    } catch (err) {
      console.error('OCR processing error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Enhanced date extraction with multiple formats
  const extractDate = (text: string): string | undefined => {
    // Combined regex for multiple date formats
    const datePatterns = [
      // MM/DD/YYYY or DD/MM/YYYY
      /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/g,
      // Month name formats: Jan 01, 2023 or January 1st, 2023
      /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
      // YYYY-MM-DD ISO format
      /\b(\d{4}[/.-]\d{1,2}[/.-]\d{1,2})\b/g
    ];
    
    // Try each pattern
    for (const pattern of datePatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        return matches[0];
      }
    }
    
    return undefined;
  };

  // Improved total amount extraction
  const extractTotal = (text: string): string | undefined => {
    // Look for typical patterns on receipts and bills
    const totalPatterns = [
      // Standard total formats with variations
      /(?:total|amount|due|balance|sum|charge)(?:\s*:|\s*due|\s*payment)?\s*\$?\s*(\d+(?:[,.]\d{1,2})?)/i,
      // Amount with $ symbol
      /\$\s*(\d+(?:[,.]\d{1,2})?)(?:\s*(?:total|amount|due|balance))/i,
      // Look for largest currency amount (often the total)
      /\$\s*(\d+(?:[,.]\d{1,2}))/g
    ];
    
    // Try specific total patterns first
    for (let i = 0; i < totalPatterns.length - 1; i++) {
      const match = text.match(totalPatterns[i]);
      if (match && match[1]) {
        return match[1].replace(',', '.');
      }
    }
    
    // If no specific total found, try to find the largest amount
    const amounts = Array.from(text.matchAll(totalPatterns[totalPatterns.length - 1]))
      .map(match => parseFloat(match[1].replace(',', '.')));
    
    if (amounts.length > 0) {
      // Return the largest amount as likely total
      return Math.max(...amounts).toFixed(2);
    }
    
    return undefined;
  };

  // Enhanced merchant name extraction
  const extractMerchant = (text: string): string | undefined => {
    // Split text into lines and clean them
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 1);
    
    // First few lines often contain the merchant name
    const headerLines = lines.slice(0, 6);
    
    // Filter out lines that look like dates, amounts, addresses, or are too short
    const potentialMerchants = headerLines.filter(line => 
      line.length > 3 && 
      !line.match(/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/) && 
      !line.match(/\$\d+\.\d{2}/) &&
      !line.match(/^\d+\s+[a-zA-Z]+\s+(?:street|st|avenue|ave|road|rd|boulevard|blvd)/i) &&
      !line.match(/^(?:tel|phone|fax|www|http)/i)
    );
    
    // Prioritize lines with all caps or title case as they're often merchant names
    const prioritizedLines = potentialMerchants
      .map(line => ({ 
        line, 
        score: (line === line.toUpperCase() ? 3 : 0) + 
               (line.match(/^[A-Z][a-z]/) ? 2 : 0) +
               (line.length > 10 ? 1 : 0) - 
               (line.length > 30 ? 2 : 0)   // Penalize very long lines
      }))
      .sort((a, b) => b.score - a.score);
    
    return prioritizedLines.length > 0 ? prioritizedLines[0].line : undefined;
  };

  return {
    processImage,
    isProcessing,
    progress,
    result,
    error,
  };
}
