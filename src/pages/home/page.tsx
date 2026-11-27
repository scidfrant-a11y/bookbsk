import { useState } from 'react';
import Navbar from '@/components/feature/Navbar';
import Footer from '@/components/feature/Footer';
import useBoard from '@/hooks/useBoard';
import Hero from './components/Hero';
import SignupForm from './components/SignupForm';
import Roster from './components/Roster';
import Rules from './components/Rules';
import MyRegs from './components/MyRegs';

export default function Home() {
  const { board, loading, error, reload, offset } = useBoard();
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="min-h-screen bg-background-50">
      <Navbar />
      <main>
        <Hero board={board} offset={offset} />
        <SignupForm board={board} onDone={() => { reload(); setRefreshKey((k) => k + 1); }} />
        <Roster board={board} loading={loading} error={error} onRetry={reload} />
        <Rules board={board} />
        <MyRegs refreshKey={refreshKey} />
      </main>
      <Footer />
    </div>
  );
}