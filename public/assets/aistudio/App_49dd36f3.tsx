import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/Guard';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { SignupPage } from './pages/SignupPage';
import { DemoAccessPage } from './pages/DemoAccessPage';
import { DashboardPage } from './pages/DashboardPage';
import { ServicesPage } from './pages/ServicesPage';
import { BookingPage } from './pages/BookingPage';
import { BookingsPage } from './pages/BookingsPage';
import { PanditsPage } from './pages/PanditsPage';
import { ShopPage } from './pages/ShopPage';
import { CartPage } from './pages/CartPage';
import { OrdersPage } from './pages/OrdersPage';
import { PanditSchedulePage } from './pages/PanditSchedulePage';
import { PanditProfilePage } from './pages/PanditProfilePage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminPanditsPage } from './pages/AdminPanditsPage';
import { AdminServicesPage } from './pages/AdminServicesPage';
import { AdminOrdersPage } from './pages/AdminOrdersPage';
import { ProfilePage } from './pages/ProfilePage';
import { TempleHeritagePage } from './pages/TempleHeritagePage';
import { SankalpPatraPage } from './pages/SankalpPatraPage';

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/admin-login" element={<AdminLoginPage />} />
              <Route path="/admin/login" element={<Navigate to="/admin-login" replace />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/demo-access" element={<DemoAccessPage />} />
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                {/* Devotee exclusive routes */}
                <Route path="services" element={<ProtectedRoute roles={['devotee']}><ServicesPage /></ProtectedRoute>} />
                <Route path="book" element={<ProtectedRoute roles={['devotee']}><BookingPage /></ProtectedRoute>} />
                <Route path="pandits" element={<ProtectedRoute roles={['devotee']}><PanditsPage /></ProtectedRoute>} />
                <Route path="bookings" element={<ProtectedRoute roles={['devotee']}><BookingsPage /></ProtectedRoute>} />
                <Route path="shop" element={<ProtectedRoute roles={['devotee']}><ShopPage /></ProtectedRoute>} />
                <Route path="cart" element={<ProtectedRoute roles={['devotee']}><CartPage /></ProtectedRoute>} />
                <Route path="orders" element={<ProtectedRoute roles={['devotee']}><OrdersPage /></ProtectedRoute>} />

                {/* Pandit exclusive routes */}
                <Route path="schedule" element={<ProtectedRoute roles={['pandit']}><PanditSchedulePage /></ProtectedRoute>} />
                <Route path="earnings" element={<ProtectedRoute roles={['pandit']}><PanditProfilePage /></ProtectedRoute>} />

                {/* Shared authenticated routes */}
                <Route path="sankalp-patra" element={<ProtectedRoute roles={['devotee', 'pandit', 'admin']}><SankalpPatraPage /></ProtectedRoute>} />
                <Route path="temple-heritage" element={<TempleHeritagePage />} />
                <Route path="profile" element={<ProtectedRoute roles={['devotee', 'pandit', 'admin']}><ProfilePage /></ProtectedRoute>} />

                {/* Admin exclusive routes */}
                <Route path="admin-users" element={<ProtectedRoute roles={['admin']}><AdminUsersPage /></ProtectedRoute>} />
                <Route path="admin-pandits" element={<ProtectedRoute roles={['admin']}><AdminPanditsPage /></ProtectedRoute>} />
                <Route path="admin-services" element={<ProtectedRoute roles={['admin']}><AdminServicesPage /></ProtectedRoute>} />
                <Route path="admin-orders" element={<ProtectedRoute roles={['admin']}><AdminOrdersPage /></ProtectedRoute>} />
              </Route>
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
