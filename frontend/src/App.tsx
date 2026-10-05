import { ThemeProvider } from './state/themeStore';
import { StoreProvider } from './state/store';
import { Layout } from './components/Layout';
import { ThemeSelector } from './components/ThemeSelector';

export function App() {
  return (
    <ThemeProvider>
      <StoreProvider>
        <Layout />
        <ThemeSelector />
      </StoreProvider>
    </ThemeProvider>
  );
}
