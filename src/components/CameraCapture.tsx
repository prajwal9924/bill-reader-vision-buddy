
import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Camera, ImageIcon, RefreshCw } from "lucide-react";

interface CameraCaptureProps {
  onImageCaptured: (imageData: string) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageCaptured }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      
      setIsCapturing(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      setCameraError('Could not access the camera. Please ensure you have granted camera permissions.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      // Draw the current video frame to the canvas
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to data URL
      const imageData = canvas.toDataURL('image/png');
      setCapturedImage(imageData);
      
      // Stop the camera stream
      stopCamera();
      
      // Pass the image data to the parent component
      onImageCaptured(imageData);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  useEffect(() => {
    // Cleanup function to stop camera when component unmounts
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      {cameraError && (
        <div className="text-red-500 mb-4 text-center">
          {cameraError}
        </div>
      )}
      
      <div className="relative w-full max-w-md h-64 bg-black rounded-lg overflow-hidden mb-4">
        {!isCapturing && !capturedImage && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
            <Camera className="w-12 h-12 mb-2" />
            <p>Camera preview will appear here</p>
          </div>
        )}
        
        {!capturedImage && (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={`w-full h-full object-cover ${isCapturing ? 'block' : 'hidden'}`}
          />
        )}
        
        {capturedImage && (
          <img 
            src={capturedImage} 
            alt="Captured bill" 
            className="w-full h-full object-contain" 
          />
        )}
        
        <canvas ref={canvasRef} className="hidden" />
      </div>
      
      <div className="flex space-x-4">
        {!isCapturing && !capturedImage && (
          <Button 
            onClick={startCamera}
            variant="default"
            className="flex items-center"
          >
            <Camera className="w-5 h-5 mr-2" />
            Start Camera
          </Button>
        )}
        
        {isCapturing && (
          <Button 
            onClick={captureImage}
            variant="default"
            className="flex items-center"
          >
            <ImageIcon className="w-5 h-5 mr-2" />
            Take Photo
          </Button>
        )}
        
        {capturedImage && (
          <Button 
            onClick={retakePhoto}
            variant="outline"
            className="flex items-center"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Retake
          </Button>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;
