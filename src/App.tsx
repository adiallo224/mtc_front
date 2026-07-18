import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Principal from './components/Principal';
import Search from './pages/Search';
import HistoriqueDemande from './pages/HistoriqueDemande';
import ParametreGeneral from './pages/ParametreGeneral';
import Parametrage from './pages/Parametrage';
import Profile from './pages/Profile';

function App() {
  return (
    <BrowserRouter basename="/mutual-conseil">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/principal" element={<Principal />}>
          <Route path="search" element={<Search />} />
          <Route path="historiqueDemande" element={<HistoriqueDemande />} />
          <Route path="parametreGeneral" element={<ParametreGeneral />} />
          <Route path="parametrage" element={<Parametrage />} />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
