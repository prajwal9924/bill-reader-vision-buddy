
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, DollarSign, Store, FileText } from "lucide-react";

interface BillResultsProps {
  fullText: string;
  date?: string;
  total?: string;
  merchant?: string;
  imagePreview?: string;
}

const BillResults: React.FC<BillResultsProps> = ({
  fullText,
  date,
  total,
  merchant,
  imagePreview
}) => {
  return (
    <div className="w-full max-w-3xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-purple-600">
            <FileText className="mr-2" />
            Bill Analysis Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {imagePreview && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-500 mb-2">Analyzed Image</p>
              <div className="bg-gray-100 p-2 rounded-lg">
                <img 
                  src={imagePreview} 
                  alt="Bill preview" 
                  className="max-h-64 mx-auto rounded-md" 
                />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {merchant && (
              <div className="flex items-start space-x-2">
                <Store className="mt-1 h-5 w-5 text-purple-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Merchant</p>
                  <p className="font-semibold">{merchant}</p>
                </div>
              </div>
            )}
            
            {date && (
              <div className="flex items-start space-x-2">
                <Calendar className="mt-1 h-5 w-5 text-purple-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Date</p>
                  <p className="font-semibold">{date}</p>
                </div>
              </div>
            )}
            
            {total && (
              <div className="flex items-start space-x-2">
                <DollarSign className="mt-1 h-5 w-5 text-purple-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Amount</p>
                  <p className="font-semibold">${total}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-gray-500">Extracted Text</p>
              <Badge variant="outline" className="text-xs">Raw OCR Data</Badge>
            </div>
            <div className="bg-gray-50 p-4 rounded-md max-h-48 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap">{fullText}</pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BillResults;
