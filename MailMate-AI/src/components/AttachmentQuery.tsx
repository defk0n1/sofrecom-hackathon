import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Paperclip, Search, Loader2, FileText } from 'lucide-react';
import { mailmateAPI } from '@/services/mailmateApi';
import { fileToBase64, formatFileSize, isAttachmentFile } from '@/utils/fileHelpers';

export default function AttachmentQuery() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!isAttachmentFile(file)) {
        setError('Please select a valid attachment file (PDF, Excel, CSV, Word, or Image)');
        return;
      }
      setSelectedFile(file);
      setError(null);
      setResult(null);
    }
  };

  const handleQuery = async () => {
    if (!selectedFile || !query.trim()) {
      setError('Please select a file and enter a query');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const base64Content = await fileToBase64(selectedFile);
      const response = await mailmateAPI.smartQuery(selectedFile.name, query, base64Content);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to query attachment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="w-5 h-5" />
            Query Attachments
          </CardTitle>
          <CardDescription>
            Upload a file and ask questions to get AI-powered insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label>Upload File</Label>
            <div
              className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <FileText className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p className="text-sm text-gray-600 mb-1">
                {selectedFile ? selectedFile.name : 'Click to upload or drag and drop'}
              </p>
              {selectedFile && (
                <p className="text-xs text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              )}
              <p className="text-xs text-gray-400 mt-2">
                Supported: PDF, Excel, CSV, Word, Images
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xlsx,.xls,.csv,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          </div>

          {/* Query Input */}
          <div className="space-y-2">
            <Label htmlFor="query">Your Question</Label>
            <Input
              id="query"
              placeholder="e.g., What's the total revenue? or Summarize this document..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleQuery()}
            />
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <Button
            onClick={handleQuery}
            disabled={loading || !selectedFile || !query.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Query Attachment
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Query Results</CardTitle>
            <CardDescription>
              File: {result.filename} | Type: {result.file_type || 'Unknown'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold mb-2">Question:</h4>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                  {result.query}
                </p>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Answer:</h4>
                <p className="text-sm text-gray-700 bg-blue-50 p-3 rounded whitespace-pre-wrap">
                  {result.answer}
                </p>
              </div>
              {result.data_preview && (
                <div>
                  <h4 className="font-semibold mb-2">Data Preview:</h4>
                  <pre className="text-xs bg-gray-50 p-3 rounded overflow-x-auto">
                    {result.data_preview}
                  </pre>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
