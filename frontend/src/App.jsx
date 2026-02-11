import { Navigate, Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Context Providers
import { AuthProvider } from './context/AuthContext.jsx';
import { SocketProvider } from './context/SocketContext.jsx';

// Layout
import { Navbar } from './components/layout/Navbar.jsx';
import { ProtectedRoute } from './components/layout/ProtectedRoute.jsx';

// Pages
import { Matches as AdminMatches } from './pages/admin/Matches.jsx';
import { Players } from './pages/admin/Players.jsx';
import { Teams as AdminTeams } from './pages/admin/Teams.jsx';
import { Users as AdminUsers } from './pages/admin/Users.jsx';
import { AuctionRoom } from './pages/AuctionRoom.jsx';
import { Login } from './pages/auth/Login.jsx';
import { Register } from './pages/auth/Register.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Landing } from './pages/Landing.jsx';
import { LiveScoreboard } from './pages/LiveScoreboard.jsx';
import { Matches } from './pages/Matches.jsx';
import { TeamDetails } from './pages/TeamDetails.jsx';
import { Teams } from './pages/Teams.jsx';

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-sports-dark">
            <Navbar />
            <main>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Protected Routes */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/auction"
                  element={
                    <ProtectedRoute>
                      <AuctionRoom />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teams"
                  element={
                    <ProtectedRoute>
                      <Teams />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/teams/:id"
                  element={
                    <ProtectedRoute>
                      <TeamDetails />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/matches"
                  element={
                    <ProtectedRoute>
                      <Matches />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/matches/:id/scoreboard"
                  element={
                    <ProtectedRoute>
                      <LiveScoreboard />
                    </ProtectedRoute>
                  }
                />

                {/* Admin Only Routes */}
                <Route
                  path="/admin/players"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <Players />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/teams"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminTeams />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/users"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminUsers />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/matches"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminMatches />
                    </ProtectedRoute>
                  }
                />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </Router>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          toastStyle={{
            backgroundColor: '#12121a',
            border: '1px solid #1e1e2e',
          }}
        />
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
