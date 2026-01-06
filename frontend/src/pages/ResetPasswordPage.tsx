import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Label } from "@/components/ui/label";

const ResetPasswordPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [token, setToken] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { resetPassword } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tokenFromUrl = params.get('token');
        if (tokenFromUrl) {
            setToken(tokenFromUrl);
        } else {
            setError('Token de redefinição não encontrado na URL.');
        }
    }, [location]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }
        if (!token) {
            setError('Token de redefinição inválido.');
            return;
        }

        setError('');
        setMessage('');
        setLoading(true);

        try {
            await resetPassword(token, password);
            setMessage('Sua senha foi redefinida com sucesso! Você será redirecionado para o login em breve.');
            setTimeout(() => {
                navigate('/login');
            }, 3000);
        } catch (err: any) {
            setError(err.message || 'Ocorreu um erro. Tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <Card className="w-full max-w-md bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100">
                <CardHeader>
                    <CardTitle className="text-2xl text-neutral-900 dark:text-neutral-100">Redefinir Senha</CardTitle>
                    <CardDescription className="text-neutral-600 dark:text-neutral-300">
                        Digite sua nova senha abaixo.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="password" className="text-neutral-800 dark:text-neutral-200">Nova Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="confirm-password" className="text-neutral-800 dark:text-neutral-200">Confirmar Nova Senha</Label>
                                <Input
                                    id="confirm-password"
                                    type="password"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading || !token}>
                                {loading ? 'Redefinindo...' : 'Redefinir Senha'}
                            </Button>
                        </div>
                    </form>
                    {message && <p className="mt-4 text-sm text-green-600 dark:text-green-400">{message}</p>}
                    {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
                </CardContent>
            </Card>
        </div>
    );
};

export default ResetPasswordPage;
