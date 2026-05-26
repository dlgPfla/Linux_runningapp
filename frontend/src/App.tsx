import { useState } from 'react';
import Layout from './components/Layout/Layout';
import HomePage from './pages/HomePage';
import CoursesPage from './CoursesPage/CoursesPage';
import MapPage from './MapPage/MapPage';
import MyPage from './MyPage/MyPage';

type Path = '/' | '/courses' | '/map' | '/mypage';

export default function App() {
  const [path, setPath] = useState<Path>('/');

  function navigate(to: string) {
    setPath(to as Path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <Layout currentPath={path} onNavigate={navigate}>
      {path === '/'        && <HomePage onNavigate={navigate} />}
      {path === '/courses' && <CoursesPage />}
      {path === '/map'     && <MapPage />}
      {path === '/mypage'  && <MyPage />}
    </Layout>
  );
}
