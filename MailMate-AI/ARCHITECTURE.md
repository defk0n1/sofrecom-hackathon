# MailMate AI Frontend Architecture

## Overview
A complete MVP frontend for MailMate AI built with React, TypeScript, and the Orange Boosted design system.

## Component Architecture

### Main Application (`App.tsx`)
- Single-page application with tab-based navigation
- Four main views: Email Analyzer, AI Chat, Attachments, Translation
- Responsive two-column layout
- State management for analysis results and email context

### Core Components

#### 1. EmailAnalyzer (`components/EmailAnalyzer.tsx`)
**Purpose**: Primary interface for email input and analysis
**Features**:
- Dual input modes (text paste / file upload)
- File validation (.eml, .msg, .txt, .pdf)
- Drag & drop support
- Loading states and error handling
**API**: `/ai/process`

#### 2. EmailAnalysisResults (`components/EmailAnalysisResults.tsx`)
**Purpose**: Display comprehensive email analysis
**Features**:
- Summary with sentiment/urgency badges
- Task list with priorities and due dates
- Meeting suggestions with details
- Entity extraction (people, orgs, dates, locations)
- Color-coded indicators
**Props**: `analysis: EmailAnalysis`

#### 3. ChatInterface (`components/ChatInterface.tsx`)
**Purpose**: Conversational AI for email questions
**Features**:
- Message history with context
- Auto-scroll to latest message
- Enter to send
- Empty state with suggestions
**API**: `/ai/chat`

#### 4. AttachmentQuery (`components/AttachmentQuery.tsx`)
**Purpose**: Smart file querying
**Features**:
- Multi-format support (PDF, Excel, CSV, Word, Images)
- Natural language queries
- File validation and preview
- Data preview display
**API**: `/attachments/smart-query`

#### 5. TranslationTool (`components/TranslationTool.tsx`)
**Purpose**: Multi-language translation
**Features**:
- 15+ language options
- Source/target language display
- Translation notes
**API**: `/ai/translate`

## Service Layer

### API Service (`services/mailmateApi.ts`)
Central API integration with typed interfaces:

```typescript
mailmateAPI.processEmail(emailText, file)
mailmateAPI.chat(history, userInput, context)
mailmateAPI.translate(text, targetLanguage, sourceLanguage)
mailmateAPI.detectTasks(emailText)
mailmateAPI.suggestMeetings(emailText, availability)
mailmateAPI.queryAttachment(filename, query, fileBase64)
mailmateAPI.smartQuery(filename, query, fileBase64)
mailmateAPI.classifyAttachment(file, extractPreview)
mailmateAPI.healthCheck()
```

## Utilities

### File Helpers (`utils/fileHelpers.ts`)
- `fileToBase64()` - Convert File to base64 string
- `formatFileSize()` - Human-readable file sizes
- `isValidFileType()` - Validate file types
- `getFileExtension()` - Extract file extension
- `isEmailFile()` - Validate email files
- `isAttachmentFile()` - Validate attachment files

## Design System

### Boosted (Orange) Components
- `btn btn-primary` - Primary action buttons
- `btn btn-secondary` - Secondary buttons
- `alert alert-danger` - Error messages
- `alert alert-info` - Info messages
- Form controls and inputs

### shadcn/ui Components
- Button, Card, Input, Label, Textarea, Badge
- Consistent styling with Tailwind CSS
- Accessible and customizable

## Data Flow

1. **Email Analysis Flow**:
   ```
   User Input → EmailAnalyzer → API Service → Backend
   Backend Response → EmailAnalysisResults → Display
   ```

2. **Chat Flow**:
   ```
   User Message → ChatInterface → API Service → Backend
   Backend Response → Update History → Display
   ```

3. **Attachment Flow**:
   ```
   File Upload → AttachmentQuery → Convert to Base64
   Base64 + Query → API Service → Backend
   Backend Response → Display Results
   ```

## State Management
- Local component state with React hooks
- Props drilling for analysis results
- Context preservation for chat history

## Type Safety
- Full TypeScript coverage
- Typed API interfaces
- Typed component props
- Type-safe form handling

## Responsive Design
- Mobile-first approach
- Grid layout (1 col mobile, 2 col desktop)
- Responsive navigation tabs
- Touch-friendly interactions

## Performance Optimizations
- Code splitting via Vite
- Lazy loading of components
- Efficient re-renders with proper key usage
- Optimized bundle size

## Accessibility
- Semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Focus management

## Environment Configuration
```env
VITE_API_URL=http://localhost:5000
```

## Build Output
- Optimized production build
- CSS minification and tree-shaking
- JavaScript bundling and compression
- Static asset optimization

## Integration Points
- Backend API: FastAPI server on port 5000
- Authentication: Ready for JWT integration
- File uploads: Base64 encoding for API compatibility
- WebSocket: Ready for real-time features

## Future Enhancements
- [ ] Task management UI
- [ ] Calendar integration for meetings
- [ ] Email composition assistant
- [ ] Batch email processing
- [ ] Advanced search and filtering
- [ ] User preferences and settings
- [ ] Notification system
- [ ] Export functionality (PDF, CSV)
