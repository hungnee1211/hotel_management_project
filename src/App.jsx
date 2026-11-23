import { Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout.jsx';
import { Can, GuestOnly, RequireAuth } from './components/layout/Guards.jsx';
import { Loading } from './components/ui/index.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import Login from './pages/auth/Login.jsx';
import Register from './pages/auth/Register.jsx';
import VerifyOtp from './pages/auth/VerifyOtp.jsx';
import NotFound from './pages/NotFound.jsx';
import { ROUTES } from './routes.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<GuestOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<VerifyOtp />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>
      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          {ROUTES.map(({ path, Page, rule, props }) => (
            <Route key={path} path={path} element={<Can rule={rule}><Suspense fallback={<Loading />}><Page {...props} /></Suspense></Can>} />
          ))}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
}
