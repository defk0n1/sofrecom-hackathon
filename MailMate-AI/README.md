# MailMate AI - Frontend

🚀 **AI-Powered Email Assistant Frontend** - A modern React application for intelligent email analysis, chat, and document processing.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Setup & Installation](#setup--installation)
- [Project Structure](#project-structure)
- [API Integration](#api-integration)
- [Development](#development)

---

## 🎯 Overview

MailMate AI Frontend is a comprehensive React application that provides an intuitive interface for:
- Email analysis with AI-powered insights
- Conversational AI chat about emails
- Smart attachment querying (PDFs, Excel, CSV, etc.)
- Multi-language translation

Built with React 19, TypeScript, Tailwind CSS, and the Orange Boosted design system.

---

## ✨ Features

### 📧 Email Analyzer
- **Dual Input Mode**: Paste text or upload email files (.eml, .msg, .txt, .pdf)
- **Comprehensive Analysis**: Summary, sentiment, urgency, key points
- **Task Detection**: Automatically extract actionable items with priorities and due dates
- **Meeting Suggestions**: Smart scheduling recommendations
- **Entity Extraction**: People, organizations, dates, and locations

### 💬 AI Chat
- **Context-Aware**: Ask questions about analyzed emails
- **Conversational**: Natural language interaction
- **Message History**: Maintains conversation context
- **Real-Time**: Instant AI responses

### 📎 Attachment Query
- **Multi-Format Support**: PDF, Excel (.xlsx, .xls), CSV, Word, Images
- **Smart Query**: Ask natural language questions about file content
- **Auto-Detection**: Automatically detects file type and extracts data
- **Data Preview**: View extracted data and AI insights

### 🌐 Translation Tool
- **15+ Languages**: French, Spanish, German, Chinese, Japanese, Arabic, and more
- **Auto-Detection**: Automatically detects source language
- **Context-Aware**: Maintains meaning and tone in translations

---

## 🛠️ Tech Stack

- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite
- **Styling**: 
  - Tailwind CSS 4
  - Boosted (Orange Design System)
  - SCSS modules
- **UI Components**: shadcn/ui
- **Icons**: lucide-react
- **API**: FastAPI backend integration

---

## 📦 Setup & Installation

### Prerequisites

- Node.js 18+ and npm
- Backend API running (see `backend/BACKEND_README.md`)

### Installation Steps

1. **Navigate to the frontend directory**
   ```bash
   cd MailMate-AI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and set your API URL:
   ```env
   VITE_API_URL=http://localhost:5000
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   
   The app will be available at `http://localhost:5173`

---

## 📁 Project Structure

```
MailMate-AI/
├── src/
│   ├── components/
│   │   ├── ui/                      # shadcn/ui base components
│   │   ├── EmailAnalyzer.tsx        # Email upload/paste component
│   │   ├── EmailAnalysisResults.tsx # Display analysis results
│   │   ├── ChatInterface.tsx        # AI chat component
│   │   ├── AttachmentQuery.tsx      # File query component
│   │   └── TranslationTool.tsx      # Translation interface
│   │
│   ├── services/
│   │   └── mailmateApi.ts           # API integration service
│   │
│   ├── utils/
│   │   └── fileHelpers.ts           # File handling utilities
│   │
│   ├── App.tsx                      # Main app component
│   └── main.tsx                     # App entry point
│
├── .env.example                     # Environment variables template
└── package.json
```

---

## 🔗 API Integration

### API Service (`src/services/mailmateApi.ts`)

All backend API calls are centralized in the `mailmateAPI` service:

```typescript
import { mailmateAPI } from '@/services/mailmateApi';

// Process email
const result = await mailmateAPI.processEmail(emailText, file);

// Chat with AI
const response = await mailmateAPI.chat(history, userInput, context);

// Translate text
const translation = await mailmateAPI.translate(text, targetLanguage);

// Query attachment
const answer = await mailmateAPI.smartQuery(filename, query, fileBase64);
```

### Available Methods

- `processEmail(emailText, file)` - Analyze email
- `chat(history, userInput, context)` - Chat with AI
- `translate(text, targetLanguage, sourceLanguage)` - Translate text
- `detectTasks(emailText)` - Extract tasks
- `suggestMeetings(emailText, availability)` - Get meeting suggestions
- `queryAttachment(filename, query, fileBase64)` - Query file
- `smartQuery(filename, query, fileBase64)` - Smart file query
- `classifyAttachment(file, extractPreview)` - Classify file
- `healthCheck()` - Check API health

---

## 🚀 Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

### Environment Variables

Create a `.env` file in the project root:

```env
# API Configuration
VITE_API_URL=http://localhost:5000
```

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: API calls fail with CORS errors
- **Solution**: Ensure backend is running and CORS is configured correctly
- Check that `VITE_API_URL` in `.env` points to the correct backend URL

**Issue**: Build fails with module errors
- **Solution**: Delete `node_modules` and `package-lock.json`, then run `npm install`

---

## 🔗 Related Documentation

- [Backend API Documentation](../backend/BACKEND_README.md)
- [Main Project README](../README.md)

---

**Built with ❤️ using React, TypeScript, and Orange Boosted**
