import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, Upload, Loader2 } from 'lucide-react';
import { mailmateAPI, type EmailAnalysis } from '@/services/mailmateApi';
import { isEmailFile, formatFileSize } from '@/utils/fileHelpers';

interface EmailAnalyzerProps {
  onAnalysisComplete: (result: {
    success: boolean;
    email_content?: string;
    analysis?: EmailAnalysis;
  }) => void;
}

export default function EmailAnalyzer({ onAnalysisComplete }: EmailAnalyzerProps) {
  const [emailText, setEmailText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!isEmailFile(file)) {
        setError('Please select a valid email file (.eml, .msg, .txt, or .pdf)');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    setError(null);
    setLoading(true);

    try {
      let result;
      if (activeTab === 'text' && emailText.trim()) {
        result = await mailmateAPI.processEmail(emailText, null);
      } else if (activeTab === 'file' && selectedFile) {
        result = await mailmateAPI.processEmail(null, selectedFile);
      } else {
        setError('Please provide email text or upload a file');
        setLoading(false);
        return;
      }

      onAnalysisComplete(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Analyzer
        </CardTitle>
        <CardDescription>
          Paste email text or upload a file to get AI-powered insights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tab Selection */}
        <div className="flex gap-2 mb-4">
          <button
            className={`btn flex-1 ${activeTab === 'text' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('text')}
          >
            Paste Text
          </button>
          <button
            className={`btn flex-1 ${activeTab === 'file' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('file')}
          >
            Upload File
          </button>
        </div>

        {activeTab === 'text' ? (
          <div className="space-y-2">
            <Label htmlFor="email-text">Email Content</Label>
            <Textarea
              id="email-text"
              placeholder="Paste your email content here..."
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Upload Email File</Label>
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">
                {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
              </p>
              {selectedFile && (
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Supported: .eml, .msg, .txt, .pdf
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".eml,.msg,.txt,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}

        <Button
          onClick={handleAnalyze}
          disabled={loading || (activeTab === 'text' ? !emailText.trim() : !selectedFile)}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            'Analyze Email'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
