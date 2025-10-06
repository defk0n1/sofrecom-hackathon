import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Languages, Loader2 } from 'lucide-react';
import { mailmateAPI } from '@/services/mailmateApi';

export default function TranslationTool() {
  const [text, setText] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('French');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
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

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="w-5 h-5" />
            Translation Tool
          </CardTitle>
          <CardDescription>
            Translate email content to any language with AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Source Text */}
          <div className="space-y-2">
            <Label htmlFor="source-text">Text to Translate</Label>
            <Textarea
              id="source-text"
              placeholder="Enter the text you want to translate..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
            />
          </div>

          {/* Target Language */}
          <div className="space-y-2">
            <Label htmlFor="target-language">Target Language</Label>
            <select
              id="target-language"
              className="form-select w-full rounded-md border border-input bg-background px-3 py-2"
              value={targetLanguage}
              onChange={(e) => setTargetLanguage(e.target.value)}
            >
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {lang}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <Button
            onClick={handleTranslate}
            disabled={loading || !text.trim()}
            className="w-full"
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
        </CardContent>
      </Card>

      {/* Translation Result */}
      {result && result.translation && (
        <Card>
          <CardHeader>
            <CardTitle>Translation Result</CardTitle>
            <CardDescription>
              {result.translation.source_language} → {result.translation.target_language}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-gray-900 whitespace-pre-wrap">
                {result.translation.translated_text}
              </p>
            </div>
            {result.translation.translation_notes && (
              <p className="text-sm text-gray-600 mt-3 italic">
                Note: {result.translation.translation_notes}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
