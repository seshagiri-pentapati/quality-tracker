import { useCallback, useState } from 'react';
import InspectionForm from './components/InspectionForm';
import InspectionList from './components/InspectionList';
import SummaryView from './components/SummaryView';
import Toast from './components/Toast';

type Tab = 'log' | 'list' | 'summary';

const TABS: { id: Tab; label: string }[] = [
  { id: 'log', label: 'Log' },
  { id: 'list', label: 'Inspections' },
  { id: 'summary', label: 'Summary' },
];

export default function App() {
  const [tab, setTab] = useState<Tab>('log');
  const [toast, setToast] = useState<string | null>(null);
  const showToast = useCallback((message: string) => setToast(message), []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Quality Inspections</h1>
      </header>

      <main className="app-main">
        {tab === 'log' && <InspectionForm onLogged={showToast} />}
        {tab === 'list' && <InspectionList onMessage={showToast} />}
        {tab === 'summary' && <SummaryView />}
      </main>

      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'tab active' : 'tab'}
            aria-current={tab === t.id ? 'page' : undefined}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
