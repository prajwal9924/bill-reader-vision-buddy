
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScanEye } from "lucide-react";
import OCRProcessor from '@/components/OCRProcessor';

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <div className="container mx-auto py-8 px-4">
        <header className="flex flex-col items-center justify-center mb-8 text-center">
          <div className="flex items-center mb-4">
            <ScanEye size={36} className="text-purple-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">Bill Reader Vision Buddy</h1>
          </div>
          <p className="max-w-2xl text-gray-600">
            Extract information from your bills and receipts using OCR technology.
            Upload an image or use your camera to scan your documents.
          </p>
        </header>

        <main className="max-w-4xl mx-auto my-8">
          <Card className="shadow-md">
            <CardHeader className="text-center">
              <CardTitle className="text-purple-700">Extract Bill Information</CardTitle>
              <CardDescription>
                Upload a bill or take a photo to extract date, amount, vendor, and more
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OCRProcessor />
            </CardContent>
          </Card>
        </main>

        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>Bill Reader Vision Buddy uses Tesseract.js for OCR processing</p>
          <p className="mt-1">© 2025 Bill Reader Vision Buddy</p>
        </footer>
      </div>
    </div>
  );
};

export default Index;
