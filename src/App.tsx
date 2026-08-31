import React, { useState, useEffect } from 'react';
import { ScreenType, ToolId, RecentDocument, GeneratedFile } from './types';
import { DocumentStore } from './services/documentStore';
import { PdfEngine } from './services/pdfEngine';
import { HomeScreen } from './components/HomeScreen';
import { ViewerScreen } from './components/ViewerScreen';
import { EditorScreen } from './components/EditorScreen';
import { SignScreen } from './components/SignScreen';
import { ToolsScreen } from './components/ToolsScreen';
import { BrowseScreen } from './components/BrowseScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { AboutScreen } from './components/AboutScreen';
import { Navigation } from './components/Navigation';
import { PasswordModal } from './components/PasswordModal';

export const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<ScreenType>('home');
  const [recentDocs, setRecentDocs] = useState<RecentDocument[]>([]);
  const [activePdf, setActivePdf] = useState<{
    filename: string;
    data: Uint8Array;
    password?: string;
  } | null>(null);

  const [activeToolId, setActiveToolId] = useState<ToolId | null>(null);

  // Password Prompt State
  const [passwordPrompt, setPasswordPrompt] = useState<{
    isOpen: boolean;
    filename: string;
    data: Uint8Array | null;
    error: string | null;
  }>({
    isOpen: false,
    filename: '',
    data: null,
    error: null,
  });

  const loadRecents = async () => {
    const docs = await DocumentStore.getRecentDocuments();
    setRecentDocs(docs);
  };

  useEffect(() => {
    loadRecents();
  }, []);

  const handleOpenPdfFile = async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const uint8 = new Uint8Array(buffer);
      const isEncrypted = await PdfEngine.isPasswordProtected(uint8);

      if (isEncrypted) {
        setPasswordPrompt({
          isOpen: true,
          filename: file.name,
          data: uint8,
          error: null,
        });
      } else {
        setActivePdf({
          filename: file.name,
          data: uint8,
        });
        setCurrentScreen('viewer');
        loadRecents();
      }
    } catch (err: any) {
      alert(`Could not open file: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleOpenRecentDoc = async (doc: RecentDocument) => {
    const loaded = await DocumentStore.loadRecentDocument(doc.id);
    if (!loaded) {
      alert('Document data could not be retrieved from local cache.');
      return;
    }

    const isEncrypted = await PdfEngine.isPasswordProtected(loaded.data);
    if (isEncrypted) {
      setPasswordPrompt({
        isOpen: true,
        filename: loaded.name,
        data: loaded.data,
        error: null,
      });
    } else {
      setActivePdf({
        filename: loaded.name,
        data: loaded.data,
      });
      setCurrentScreen('viewer');
    }
  };

  const handleUnlockPassword = async (password: string) => {
    if (!passwordPrompt.data) return;
    try {
      // Test password against doc
      const meta = await PdfEngine.readMeta(passwordPrompt.data, password);
      if (meta.isEncrypted) {
        setPasswordPrompt((prev) => ({
          ...prev,
          error: 'Incorrect password. Please try again.',
        }));
        return;
      }

      setActivePdf({
        filename: passwordPrompt.filename,
        data: passwordPrompt.data,
        password,
      });
      setPasswordPrompt({ isOpen: false, filename: '', data: null, error: null });
      setCurrentScreen('viewer');
      loadRecents();
    } catch (err: any) {
      setPasswordPrompt((prev) => ({
        ...prev,
        error: 'Incorrect password. Please try again.',
      }));
    }
  };

  const handleOpenTool = (toolId: ToolId) => {
    setActiveToolId(toolId);
    setCurrentScreen('tools');
  };

  const handleOpenGeneratedInViewer = (file: GeneratedFile) => {
    setActivePdf({
      filename: file.name,
      data: file.data,
    });
    setCurrentScreen('viewer');
  };

  const handleEditorSaved = (newData: Uint8Array, newFilename: string) => {
    setActivePdf({
      filename: newFilename,
      data: newData,
    });
    loadRecents();
    setCurrentScreen('viewer');
  };

  const isFullScreen = currentScreen === 'viewer' || currentScreen === 'editor';

  return (
    <div className="flex h-screen w-full flex-col bg-white font-sans text-neutral-900 antialiased overflow-hidden">
      {/* Screen Renderers */}
      <main className="flex flex-1 flex-col overflow-hidden relative">
        {currentScreen === 'home' && (
          <HomeScreen
            recentDocs={recentDocs}
            onOpenPdf={handleOpenPdfFile}
            onOpenRecent={handleOpenRecentDoc}
            onNavigate={(s) => {
              setActiveToolId(null);
              setCurrentScreen(s);
            }}
            onOpenTool={handleOpenTool}
            onClearRecents={async () => {
              await DocumentStore.clearRecents();
              loadRecents();
            }}
            onRemoveRecent={async (id) => {
              await DocumentStore.removeRecent(id);
              loadRecents();
            }}
          />
        )}

        {currentScreen === 'viewer' && activePdf && (
          <ViewerScreen
            filename={activePdf.filename}
            data={activePdf.data}
            password={activePdf.password}
            onBack={() => setCurrentScreen('home')}
            onEdit={() => setCurrentScreen('editor')}
            onSign={() => setCurrentScreen('sign')}
          />
        )}

        {currentScreen === 'editor' && activePdf && (
          <EditorScreen
            filename={activePdf.filename}
            data={activePdf.data}
            password={activePdf.password}
            onBack={() => setCurrentScreen('viewer')}
            onSaved={handleEditorSaved}
          />
        )}

        {currentScreen === 'sign' && (
          <SignScreen
            initialData={activePdf?.data}
            initialFilename={activePdf?.filename}
            onBack={() => setCurrentScreen('home')}
          />
        )}

        {currentScreen === 'tools' && (
          <ToolsScreen
            initialToolId={activeToolId}
            onOpenViewer={handleOpenGeneratedInViewer}
            onNavigateToSign={() => setCurrentScreen('sign')}
          />
        )}

        {currentScreen === 'browse' && (
          <BrowseScreen
            recentDocs={recentDocs}
            onOpenPdf={handleOpenPdfFile}
            onOpenRecent={handleOpenRecentDoc}
            onRemoveRecent={async (id) => {
              await DocumentStore.removeRecent(id);
              loadRecents();
            }}
            onClearRecents={async () => {
              await DocumentStore.clearRecents();
              loadRecents();
            }}
          />
        )}

        {currentScreen === 'settings' && (
          <SettingsScreen
            onClearAllData={() => {
              loadRecents();
              setActivePdf(null);
            }}
          />
        )}

        {currentScreen === 'about' && <AboutScreen />}
      </main>

      {/* Persistent Bottom Navigation for top-level screens */}
      {!isFullScreen && (
        <Navigation
          currentScreen={currentScreen}
          onNavigate={(screen) => {
            setActiveToolId(null);
            setCurrentScreen(screen);
          }}
        />
      )}

      {/* Password Prompt Modal */}
      {passwordPrompt.isOpen && (
        <PasswordModal
          filename={passwordPrompt.filename}
          error={passwordPrompt.error}
          onConfirm={handleUnlockPassword}
          onCancel={() =>
            setPasswordPrompt({ isOpen: false, filename: '', data: null, error: null })
          }
        />
      )}
    </div>
  );
};
export default App;
