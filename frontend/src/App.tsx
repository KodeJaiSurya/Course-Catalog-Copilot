import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import HomePage from "./pages/HomePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ProfilePage from "./pages/UserProfilePage";
import PrivacyPage  from './pages/Privacy';
import DataSourcesPage from './pages/DataSources';
import FairnessAndLimitationsPage from './pages/Fairness';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/data-sources" element={<DataSourcesPage />} />
        <Route path="/fairness" element={<FairnessAndLimitationsPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
