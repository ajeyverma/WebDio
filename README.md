# ⚡ WebDio


[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-181717?style=flat&logo=github&logoColor=white)](https://github.com/ajeyverma)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=flat&logo=linkedin&logoColor=white)](https://linkedin.com/in/ajeyverma)
[![Instagram](https://img.shields.io/badge/Instagram-E4405F?style=flat&logo=instagram&logoColor=white)](https://instagram.com/ajayverma097)

WebDio is a high-performance, AI-driven IDE designed for rapid web development and real-time P2P collaboration. Go from idea to minimum viable product by leveraging AI models and a secure, decentralized sharing protocol.

## 🚀 Key Features

### 📡 P2P Project Sharing
- **Decentralized Collaboration**: Share your entire workspace with peers on the local network without any central server
- **Granular Permissions**: Toggle between `Read Only` and `Read & Write` modes for secure collaboration
- **Robust Protocol**: Uses a network discovery protocol for instant peer detection
- **One-Click Revocation**: Instantly revoke project access with automatic network cleanup

### 🎨 Intelligent Workspace
- **Color-Coded Projects**: Unique visual identities for every shared project, reflected in the sidebar and editor tabs
- **Professional File Explorer**: Recursive tree view with context menu support and hidden file toggling
- **Tabbed Interface**: Distinguish between local and shared files with color indicators and project tags

### 🤖 AI-Powered Productivity
- **Google Gemini**: Full integration with Gemini for code generation and assistance
- **Walkthroughs**: Built-in system for generating development plans and executing builds from requirements
- **Context-Aware Chat**: AI chat panel for debugging and feature implementation assistance

### 💻 Cross-Platform Support
- **Windows, macOS, Linux**: Desktop application built with Electron
- **Mobile Ready**: React Native Android companion app included

## 🛠️ Technology Stack

### Frontend
- **Framework**: [React](https://react.dev/) 18.3 + [Vite](https://vitejs.dev/) 5.3
- **Editor**: [Monaco Editor](https://microsoft.github.io/monaco-editor/) (VS Code's editor engine)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + Vanilla CSS
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)

### Desktop
- **Platform**: [Electron](https://www.electronjs.org/) 33.2 with Vite integration
- **Build**: [electron-builder](https://www.electron.build/)

### AI Integration
- **Providers**: Google Generative AI (Gemini)
- **HTTP Client**: Axios

## 📦 Installation

### Prerequisites
- Node.js 18+
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd WebDio
```

2. **Install dependencies**
```bash
npm install
```

3. **Development mode**
```bash
npm run dev
```
The Electron app will launch with hot module reloading.

4. **Build for production**
```bash
npm run build
```

5. **Build Windows installer**
```bash
npm run build:win
```

## 🎯 Usage

### Running the Desktop App

**Development**:
```bash
npm run dev
```

**Production**:
```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
WebDio/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts
│   │   └── services/         # IPC services (AI, Community, Project, Server, Settings)
│   ├── preload/              # Electron preload scripts
│   └── renderer/             # React UI
│       └── src/
│           ├── components/   # Reusable UI components
│           ├── features/     # Feature modules (Community, etc.)
│           ├── stores/       # Zustand state stores
│           └── utils/        # Utility functions
├── electron.vite.config.ts   # Electron + Vite configuration
├── tailwind.config.js        # Tailwind CSS configuration
├── tsconfig.json             # TypeScript configuration
└── package.json              # Project dependencies
```

## 🔌 Key Components

### AI Services
- `src/main/services/aiService.ts` - Main AI integration service
- Supports multiple AI providers with unified interface

### Community Features
- `src/renderer/src/features/Community/` - Community chat and collaboration
- P2P messaging and project sharing protocols

### Editor
- `src/renderer/src/components/` - Monaco Editor integration
- File syntax highlighting and IntelliSense support

### State Management
- `src/renderer/src/stores/useAppStore.ts` - Global application state with Zustand
- Project state, UI state, and user preferences

## 🚀 Development

### Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run build:win` | Build Windows installer |

### Debugging

The app supports TypeScript with full source maps for debugging. Use DevTools:
- Press `Ctrl+Shift+I` (or `Cmd+Option+I` on macOS) in the development build to open DevTools

## 🔐 Security

- **Decentralized**: No central server or data collection
- **Granular Permissions**: Control read/write access on a per-project basis

## 📝 License

Distributed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Contact

**Ajay Chaudhary (Ajay Verma)**
- **GitHub**: [@ajeyverma](https://github.com/ajeyverma)
- **LinkedIn**: [in/ajeyverma](https://linkedin.com/in/ajeyverma)
- **Instagram**: [@ajayverma097](https://instagram.com/ajayverma097)
- **Facebook**: [mrcurioux](https://facebook.com/mrcurioux)

Project Link: [https://github.com/ajeyverma/WebDio](https://github.com/ajeyverma/WebDio)


