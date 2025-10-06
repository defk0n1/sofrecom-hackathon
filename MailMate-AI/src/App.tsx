import "./scss/styles.scss";
import { useState } from "react";
import { Mail, MessageCircle, Paperclip, Languages, Sparkles } from "lucide-react";
import EmailAnalyzer from "@/components/EmailAnalyzer";
import EmailAnalysisResults from "@/components/EmailAnalysisResults";
import ChatInterface from "@/components/ChatInterface";
import AttachmentQuery from "@/components/AttachmentQuery";
import TranslationTool from "@/components/TranslationTool";

type ActiveView = 'analyzer' | 'chat' | 'attachment' | 'translate';

function App() {
  const [activeView, setActiveView] = useState<ActiveView>('analyzer');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [emailContext, setEmailContext] = useState<string>('');

  const handleAnalysisComplete = (result: any) => {
    setAnalysisResult(result);
    setEmailContext(result.email_content || '');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary text-white p-2 rounded-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">MailMate AI</h1>
                <p className="text-sm text-gray-600">AI-Powered Email Assistant</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Navigation */}
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              className={`btn ${activeView === 'analyzer' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 whitespace-nowrap`}
              onClick={() => setActiveView('analyzer')}
            >
              <Mail className="w-4 h-4" />
              Email Analyzer
            </button>
            <button
              className={`btn ${activeView === 'chat' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 whitespace-nowrap`}
              onClick={() => setActiveView('chat')}
            >
              <MessageCircle className="w-4 h-4" />
              AI Chat
            </button>
            <button
              className={`btn ${activeView === 'attachment' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 whitespace-nowrap`}
              onClick={() => setActiveView('attachment')}
            >
              <Paperclip className="w-4 h-4" />
              Attachments
            </button>
            <button
              className={`btn ${activeView === 'translate' ? 'btn-primary' : 'btn-secondary'} flex items-center gap-2 whitespace-nowrap`}
              onClick={() => setActiveView('translate')}
            >
              <Languages className="w-4 h-4" />
              Translate
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Main View */}
          <div>
            {activeView === 'analyzer' && (
              <EmailAnalyzer onAnalysisComplete={handleAnalysisComplete} />
            )}
            {activeView === 'chat' && (
              <ChatInterface emailContext={emailContext} />
            )}
            {activeView === 'attachment' && (
              <AttachmentQuery />
            )}
            {activeView === 'translate' && (
              <TranslationTool />
            )}
          </div>

          {/* Right Column - Results */}
          <div>
            {analysisResult && analysisResult.analysis && (
              <EmailAnalysisResults
                analysis={analysisResult.analysis}
                emailContent={analysisResult.email_content}
              />
            )}
          </div>
        </div>

        {/* Features Info */}
        {!analysisResult && activeView === 'analyzer' && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg border">
              <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Mail className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Smart Analysis</h3>
              <p className="text-sm text-gray-600">
                Get instant insights, sentiment analysis, and extract key points from any email
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <MessageCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">AI Chat</h3>
              <p className="text-sm text-gray-600">
                Ask questions about your emails and get intelligent, context-aware responses
              </p>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Paperclip className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Attachment Query</h3>
              <p className="text-sm text-gray-600">
                Upload PDFs, Excel, CSV files and ask questions to extract information
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="bg-white border-t mt-12">
        <div className="container mx-auto px-4 py-6">
          <p className="text-center text-sm text-gray-600">
            Powered by Google Gemini AI | Built with React + FastAPI
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
