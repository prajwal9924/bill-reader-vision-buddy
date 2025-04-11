
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { AlertCircle, FileWarning, Loader2 } from "lucide-react";
import FileUpload from './FileUpload';
import CameraCapture from './CameraCapture';
import BillResults from './BillResults';
import { useOCR } from '@/hooks/useOCR';

const OCRProcessor: React.FC = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("upload");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const {
    processImage,
    isProcessing,
    progress,
    result,
    error
  } = useOCR();

  const handleFileSelected = async (file: File) => {
    try {
      // Create preview URL for the file
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
      
      // Process the file with OCR
      await processImage(file);
      
      toast({
        title: "Processing Complete",
        description: "Your bill has been successfully analyzed.",
      });
    } catch (err) {
      console.error('Error processing file:', err);
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: "There was an error processing your bill.",
      });
    }
  };

  const handleImageCaptured = async (imageData: string) => {
    try {
      setImagePreview(imageData);
      
      // Convert data URL to Blob for processing
      const response = await fetch(imageData);
      const blob = await response.blob();
      
      // Process the image with OCR
      await processImage(imageData);
      
      toast({
        title: "Processing Complete",
        description: "Your bill has been successfully analyzed.",
      });
    } catch (err) {
      console.error('Error processing captured image:', err);
      toast({
        variant: "destructive",
        title: "Processing Failed",
        description: "There was an error processing your bill.",
      });
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      {!result && (
        <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Bill</TabsTrigger>
            <TabsTrigger value="camera">Camera Capture</TabsTrigger>
          </TabsList>
          
          <TabsContent value="upload" className="pt-6">
            <FileUpload onFileSelected={handleFileSelected} />
          </TabsContent>
          
          <TabsContent value="camera" className="pt-6">
            <CameraCapture onImageCaptured={handleImageCaptured} />
          </TabsContent>
        </Tabs>
      )}
      
      {isProcessing && (
        <div className="mt-8 space-y-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
            <p>Processing your bill...</p>
          </div>
          <Progress value={progress} className="h-2" />
          <p className="text-xs text-gray-500 text-center">{Math.round(progress)}% complete</p>
        </div>
      )}
      
      {error && (
        <Alert variant="destructive" className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Error processing your bill: {error}
          </AlertDescription>
        </Alert>
      )}
      
      {result && !isProcessing && (
        <div className="mt-8 space-y-4">
          <BillResults 
            fullText={result.fullText}
            date={result.date}
            total={result.total}
            merchant={result.merchant}
            imagePreview={imagePreview || undefined}
          />
          
          <div className="flex justify-center mt-8">
            <button
              onClick={() => {
                setActiveTab("upload");
                setImagePreview(null);
              }}
              className="text-purple-600 hover:text-purple-800 underline"
            >
              Process another bill
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OCRProcessor;
