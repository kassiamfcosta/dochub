import React, { useState, useEffect } from 'react';
import { adminService, AdminStats } from '../services/admin.service';

const AdminPage: React.FC = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await adminService.getStats();
        if (response.success && response.data) {
          setStats(response.data);
        } else {
          setError(response.message || 'Falha ao buscar estatísticas.');
        }
      } catch (err) {
        setError('Ocorreu um erro de rede. Tente novamente.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Painel Administrativo</h1>

      {loading && <p>Carregando estatísticas...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold">Total de Usuários</h2>
            <p className="text-3xl font-bold">{stats.totalUsers}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold">Total de Transcrições</h2>
            <p className="text-3xl font-bold">{stats.totalTranscriptions}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
