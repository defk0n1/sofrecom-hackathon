import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Languages, Loader2, CopyIcon, CheckIcon, RefreshCw } from 'lucide-react';
import { mailmateAPI } from '@/services/mailmateApi';

export default function TranslationTool() {
  const [text, setText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('French');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<{
    translation?: {
      translated_text: string;
      source_language: string;
      target_language: string;
      translation_notes?: string;
    };
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const languages = [
    'French', 'Spanish', 'German', 'Italian', 'Portuguese',
    'Chinese', 'Japanese', 'Korean', 'Arabic', 'Russian',
    'Dutch', 'Polish', 'Turkish', 'Hindi', 'Swedish'
  ];

  const handleTranslate = async () => {
    if (!text.trim()) {
      setError('Please enter text to translate');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await mailmateAPI.translate(text, targetLanguage);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Translation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result?.translation?.translated_text) {
      navigator.clipboard.writeText(result.translation.translated_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSwap = () => {
    if (result?.translation) {
      setText(result.translation.translated_text);
      setTargetLanguage(result.translation.source_language);
      setResult(null);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-supporting-orange" />
            Translation Tool
          </CardTitle>
          <CardDescription>
            Translate email content to any language with AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {/* Source Text */}
          <div className="space-y-2">
            <Label htmlFor="source-text" className="flex justify-between">
              <span>Text to Translate</span>
              <span className="text-xs text-gray-500">{text.length} characters</span>
            </Label>
            <Textarea
              id="source-text"
              placeholder="Enter the text you want to translate..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="form-control resize-none border-gray-300 focus:border-supporting-orange focus:ring focus:ring-supporting-orange focus:ring-opacity-50"
            />
          </div>

          {/* Target Language */}
          <div className="space-y-2">
            <Label htmlFor="target-language">Target Language</Label>
            <div className="flex gap-2">
              <select
                id="target-language"
                className="form-select flex-1 rounded-md border border-gray-300 bg-background px-3 py-2 focus:border-supporting-orange focus:ring focus:ring-supporting-orange focus:ring-opacity-50"
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
              >
                {languages.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang}
                  </option>
                ))}
              </select>
              
              {result?.translation && (
                <Button
                  onClick={handleSwap}
                  className="btn btn-outline-secondary"
                  title="Swap languages and translate back"
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {error && (
            <div className="alert alert-danger bg-red-100 text-red-800 p-3 rounded-md" role="alert">
              {error}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between pt-0">
          <Button
            variant="outline"
            onClick={() => {
              setText('');
              setResult(null);
              setError(null);
            }}
            className="btn btn-outline-secondary"
            disabled={loading || !text.trim()}
          >
            Clear
          </Button>
          
          <Button
            onClick={handleTranslate}
            disabled={loading || !text.trim()}
            className="btn btn-primary bg-supporting-orange hover:bg-opacity-90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Translating...
              </>
            ) : (
              <>
                <Languages className="mr-2 h-4 w-4" />
                Translate
              </>
            )}
          </Button>
        </CardFooter>
      </Card>

      {/* Translation Result */}
      {result && result.translation && (
        <Card className="shadow-sm border-gray-200 overflow-hidden">
          <CardHeader className="bg-gray-50 border-b pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg">Translation Result</CardTitle>
              <Button
                variant="outline" 
                size="sm"
                onClick={handleCopy}
                className="btn btn-sm btn-outline-secondary"
                title="Copy translation to clipboard"
              >
                {copied ? <CheckIcon className="w-4 h-4 text-green-600" /> : <CopyIcon className="w-4 h-4" />}
              </Button>
            </div>
            <CardDescription>
              <span className="inline-flex items-center bg-gray-200 text-gray-800 rounded-full px-2 py-1 text-xs">
                {result.translation.source_language} 
                <span className="mx-1">→</span> 
                {result.translation.target_language}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <p className="text-gray-900 whitespace-pre-wrap">
                {result.translation.translated_text}
              </p>
            </div>
            {result.translation.translation_notes && (
              <p className="text-sm text-gray-600 mt-3 italic">
                <span className="font-medium">Note:</span> {result.translation.translation_notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
