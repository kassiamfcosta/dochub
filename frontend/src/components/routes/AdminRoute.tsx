import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export const AdminRoute = () => {
  const { isAuthenticated, isAdmin, loading } = useAuth();

  if (loading) {
    return <div>Carregando...</div>; // Ou um componente de spinner/loading
  }

  if (!isAuthenticated || !isAdmin) {
    // Redireciona para o dashboard se não estiver autenticado ou não for admin
    return <Navigate to="/dashboard" replace />;
  }

  // Se for admin e autenticado, renderiza a rota filha (componente da página)
  return <Outlet />;
};
