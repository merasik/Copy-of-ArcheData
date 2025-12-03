
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { LandingPage } from './components/LandingPage';
import { Diary } from './components/Diary';
import { Database } from './components/Database';
import { Community } from './components/Community';
import { Profile } from './components/Profile';
import { Settings } from './components/Settings';
import { AuthModal } from './components/AuthModal';
import { storageService } from './services/storageService';
import { User, Language, Theme } from './types';

type View = 'landing' | 'diary' | 'database' | 'community' | 'profile' | 'settings';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-stone-100 text-stone-800 p-4">
          <div className="text-center">
            <h1 className="text-2xl font-serif font-bold mb-2">Что-то пошло не так</h1>
            <p className="mb-4">Пожалуйста, перезагрузите страницу.</p>
            <button onClick={() => window.location.reload()} className="bg-amber-600 text-white px-4 py-2 rounded">
              Перезагрузить
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<View>('landing');
  const [showAuthModal, setShowAuthModal] = useState(false);
  
  // Settings State
  const [language, setLanguage] = useState<Language>('ru');
  const [theme, setTheme] = useState<Theme>('light');

  // Initial Load & Hash Routing
  useEffect(() => {
    // 1. Load User
    const user = storageService.getCurrentUser();
    if (user) setCurrentUser(user);

    // 2. Load Settings
    const savedLang = localStorage.getItem('archedata_lang') as Language;
    if (savedLang) setLanguage(savedLang);

    const savedTheme = localStorage.getItem('archedata_theme') as Theme;
    if (savedTheme) setTheme(savedTheme);

    // 3. Handle Initial Hash
    const hash = window.location.hash.replace('#', '') as View;
    if (hash && ['landing', 'diary', 'database', 'community', 'profile', 'settings'].includes(hash)) {
       // Protect private routes
       if ((hash === 'diary' || hash === 'profile') && !user) {
          window.location.hash = 'landing';
          setCurrentView('landing');
       } else {
          setCurrentView(hash);
       }
    }

    // 4. Listen for hash changes (Browser Back Button)
    const handleHashChange = () => {
      const newHash = window.location.hash.replace('#', '') as View;
      if (['landing', 'diary', 'database', 'community', 'profile', 'settings'].includes(newHash)) {
         setCurrentView(newHash);
      } else if (!newHash) {
         setCurrentView('landing');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Apply Theme Side Effect
  useEffect(() => {
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('archedata_theme', theme);
  }, [theme]);

  // Apply Language Persistence
  useEffect(() => {
    localStorage.setItem('archedata_lang', language);
  }, [language]);


  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setShowAuthModal(false);
    // If on landing, go to diary, otherwise stay (e.g. community)
    if (currentView === 'landing') {
        setCurrentView('diary');
        window.location.hash = 'diary';
    }
  };

  const handleLogout = () => {
    storageService.logout();
    setCurrentUser(null);
    setCurrentView('landing');
    window.location.hash = 'landing';
  };

  const handleViewChange = (view: string) => {
    if ((view === 'diary' || view === 'profile') && !currentUser) {
      setShowAuthModal(true);
      return;
    }
    setCurrentView(view as View);
    window.location.hash = view;
    // Scroll to top
    window.scrollTo(0,0);
  };

  return (
    <ErrorBoundary>
      <div className="antialiased min-h-screen flex flex-col bg-stone-100 text-stone-900 dark:bg-stone-950 dark:text-stone-100 transition-colors duration-300">
        <Header 
          currentUser={currentUser}
          currentView={currentView}
          onChangeView={handleViewChange}
          onLoginClick={() => setShowAuthModal(true)}
          onLogoutClick={handleLogout}
          onProfileClick={() => handleViewChange('profile')}
          onSettingsClick={() => handleViewChange('settings')}
          lang={language}
        />

        <main className="flex-1 w-full">
          {currentView === 'landing' && (
            <LandingPage onStart={() => currentUser ? handleViewChange('diary') : setShowAuthModal(true)} />
          )}
          {currentView === 'diary' && currentUser && (
            <Diary currentUser={currentUser} lang={language} />
          )}
          {currentView === 'database' && (
            <Database lang={language} />
          )}
          {currentView === 'community' && (
            <Community 
              currentUser={currentUser} 
              onLoginRequest={() => setShowAuthModal(true)}
              lang={language}
            />
          )}
          {currentView === 'profile' && currentUser && (
            <Profile currentUser={currentUser} lang={language} />
          )}
          {currentView === 'settings' && (
            <Settings 
              lang={language} setLang={setLanguage}
              theme={theme} setTheme={setTheme}
            />
          )}
        </main>

        {showAuthModal && (
          <AuthModal 
            onClose={() => setShowAuthModal(false)}
            onSuccess={handleLogin}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
