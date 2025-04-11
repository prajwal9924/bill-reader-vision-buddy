
import { useState } from 'react';
import * as Tesseract from 'tesseract.js';

interface BillData {
  fullText: string;
  date?: string;
  total?: string;
  merchant?: string;
}

// Enhanced image preprocessing for better OCR results
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
      
      // Advanced preprocessing pipeline
      // 1. Grayscale conversion with accurate weighting
      for (let i = 0; i < data.length; i += 4) {
        const grayscale = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = grayscale;     // R
        data[i + 1] = grayscale; // G
        data[i + 2] = grayscale; // B
      }
      
      // 2. Calculate histogram for adaptive thresholding
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) {
        histogram[Math.floor(data[i])]++;
      }
      
      // 3. Otsu's method for optimal threshold
      let sum = 0;
      for (let i = 0; i < 256; i++) {
        sum += i * histogram[i];
      }
      
      let sumB = 0;
      let wB = 0;
      let wF = 0;
      let maxVariance = 0;
      let threshold = 0;
      const total = canvas.width * canvas.height;
      
      for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        
        wF = total - wB;
        if (wF === 0) break;
        
        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        
        const variance = wB * wF * (mB - mF) * (mB - mF);
        if (variance > maxVariance) {
          maxVariance = variance;
          threshold = t;
        }
      }
      
      // 4. Apply adaptive threshold and increase contrast
      for (let i = 0; i < data.length; i += 4) {
        // Apply threshold with a slight bias to improve text visibility
        const value = data[i] > threshold ? 255 : 0;
        
        data[i] = value;     // R
        data[i + 1] = value; // G
        data[i + 2] = value; // B
      }
      
      // 5. Noise reduction (simple median filter)
      if (canvas.width > 10 && canvas.height > 10) {
        const tempData = new Uint8ClampedArray(data);
        
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < canvas.width - 1; x++) {
            const idx = (y * canvas.width + x) * 4;
            
            // Skip if pixel is clearly white or black (reduces processing)
            if (data[idx] === 0 || data[idx] === 255) continue;
            
            // Simple 3x3 median filter for noise reduction
            const neighbors = [];
            for (let j = -1; j <= 1; j++) {
              for (let i = -1; i <= 1; i++) {
                const index = ((y + j) * canvas.width + (x + i)) * 4;
                neighbors.push(tempData[index]);
              }
            }
            
            neighbors.sort((a, b) => a - b);
            const median = neighbors[4]; // Middle of 9 elements
            
            data[idx] = median;
            data[idx + 1] = median;
            data[idx + 2] = median;
          }
        }
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
      console.log("Preprocessing image with enhanced algorithms...");
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
      
      // Configure Tesseract for receipt recognition with optimal parameters
      // Using the correct type for tessedit_pageseg_mode
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ$,.:/\\-& ',
        tessedit_pageseg_mode: "6" as Tesseract.PSM, // Using string with type assertion to fix the error
        preserve_interword_spaces: '1',
        tessedit_ocr_engine_mode: '2', // Use LSTM only
        tessjs_create_hocr: '0',      // Disable HOCR to speed up
        tessjs_create_tsv: '0',       // Disable TSV to speed up
        textord_heavy_nr: '1',        // More aggressive noise removal
        textord_min_linesize: '2.5',  // Better line detection for bills
      });
      
      console.log("Running enhanced OCR on preprocessed image...");
      const ret = await worker.recognize(processedImage);
      
      await worker.terminate();
      
      const text = ret.data.text;
      console.log("OCR completed with improved accuracy. Raw text:", text.substring(0, 100) + "...");
      
      // Parse the bill data with improved extractors
      const billData: BillData = {
        fullText: text,
        date: extractDate(text),
        total: extractTotal(text),
        merchant: extractMerchant(text),
      };
      
      console.log("Extracted data with enhanced accuracy:", billData);
      setResult(billData);
    } catch (err) {
      console.error('OCR processing error:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsProcessing(false);
    }
  };

  // Enhanced date extraction with multiple formats and validation
  const extractDate = (text: string): string | undefined => {
    // Format text for better detection
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Combined regex for multiple date formats with validation
    const datePatterns = [
      // MM/DD/YYYY or DD/MM/YYYY
      /\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4})\b/g,
      // Month name formats: Jan 01, 2023 or January 1st, 2023
      /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}\b/gi,
      // YYYY-MM-DD ISO format
      /\b(\d{4}[/.-]\d{1,2}[/.-]\d{1,2})\b/g,
      // Looking for "Date:" or "DATE" followed by a date
      /(?:Date|DATE|Invoice Date|Transaction Date|Purchase Date)[:\s]+([A-Za-z0-9\s,./-]+?)(?:\n|$|\s{2,})/i
    ];
    
    // Try each pattern with validation
    for (const pattern of datePatterns) {
      const matches = cleanText.match(pattern);
      if (matches && matches.length > 0) {
        // For keyword matches, extract the date from the captured group
        if (pattern.toString().includes('Date|DATE')) {
          const dateMatch = matches[1].trim();
          // Return only if it looks like a date (contains digits and separators)
          if (/\d+/.test(dateMatch) && /[\/\-.]/.test(dateMatch)) {
            return dateMatch;
          }
        } else {
          return matches[0];
        }
      }
    }
    
    return undefined;
  };

  // Improved total amount extraction with contextual understanding
  const extractTotal = (text: string): string | undefined => {
    // First look for total with more contextual hints
    const cleanText = text.replace(/\s+/g, ' ').trim();
    
    // Order patterns from most to least specific
    const totalPatterns = [
      // Total/Amount/Sum with keywords in close proximity
      /(?:total\s+amount|grand\s+total|amount\s+due|balance\s+due|total\s+due|total\s+to\s+pay)[:\s]*\$?\s*(\d+(?:[,.]\d{1,2}))/i,
      
      // Standard total formats with variations
      /(?:total|amount|due|balance|sum|charge)(?:\s*:|\s*due|\s*payment)?\s*\$?\s*(\d+(?:[,.]\d{1,2})?)/i,
      
      // Amount with $ symbol near total keyword
      /\$\s*(\d+(?:[,.]\d{1,2})?)(?:\s*(?:total|amount|due))/i,
      
      // Find lines with currency symbols and extract the largest value
      /\$\s*(\d+(?:[,.]\d{1,2}))/g
    ];
    
    // Try specific total patterns first
    for (let i = 0; i < totalPatterns.length - 1; i++) {
      const match = cleanText.match(totalPatterns[i]);
      if (match && match[1]) {
        // Clean and validate the total
        const total = match[1].replace(',', '.');
        if (parseFloat(total) > 0) {
          return total;
        }
      }
    }
    
    // If no specific total found, find all currency amounts
    const amounts = Array.from(cleanText.matchAll(totalPatterns[totalPatterns.length - 1]))
      .map(match => {
        const value = match[1].replace(',', '.');
        return {
          value: value,
          amount: parseFloat(value),
          index: match.index || 0
        };
      })
      .filter(item => !isNaN(item.amount) && item.amount > 0);
    
    if (amounts.length > 0) {
      // Sort by amount in descending order
      amounts.sort((a, b) => b.amount - a.amount);
      
      // Return the largest amount as likely total
      // But exclude very large amounts that might be account numbers
      const reasonableAmounts = amounts.filter(a => a.amount < 100000);
      if (reasonableAmounts.length > 0) {
        return reasonableAmounts[0].value;
      }
    }
    
    return undefined;
  };

  // Enhanced merchant name extraction with more intelligent pattern recognition
  const extractMerchant = (text: string): string | undefined => {
    // Split text into lines and clean them
    const lines = text.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 2);
    
    // First look for explicit merchant indicators
    const merchantPatterns = [
      /(?:merchant|vendor|store|business|retailer|seller|company)[:\s]+([A-Za-z0-9\s&,.'\-]+)/i,
      /(?:invoice from|receipt from|sold by)[:\s]+([A-Za-z0-9\s&,.'\-]+)/i
    ];
    
    for (const pattern of merchantPatterns) {
      for (const line of lines) {
        const match = line.match(pattern);
        if (match && match[1] && match[1].length > 2) {
          return match[1].trim();
        }
      }
    }
    
    // If no explicit merchant found, use heuristics to find the merchant name
    // First few lines often contain the merchant name
    const headerLines = lines.slice(0, Math.min(6, lines.length));
    
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
        score: (line === line.toUpperCase() ? 4 : 0) + 
               (line.match(/^[A-Z][a-z]/) ? 3 : 0) +
               (line.length > 7 ? 2 : 0) +
               (line.length < 30 ? 1 : 0) - // Prefer shorter names that are still substantial
               (line.match(/\d{3,}/) ? 3 : 0) // Penalize lines with many numbers
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
