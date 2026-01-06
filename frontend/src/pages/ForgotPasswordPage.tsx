import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from "@/contexts/AuthContext";
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Label } from '@/components/ui/label';

const ForgotPasswordPage: React.FC = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { requestPasswordReset } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            await requestPasswordReset(email);
            setMessage('Se um usuário com este e-mail for encontrado, um link de redefinição de senha será enviado.');
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
                    <CardTitle className="text-2xl text-neutral-900 dark:text-neutral-100">Esqueceu a Senha?</CardTitle>
                    <CardDescription className="text-neutral-600 dark:text-neutral-300">
                        Digite seu e-mail para receber um link de redefinição de senha.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="email" className="text-neutral-800 dark:text-neutral-200">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={loading}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={loading}>
                                {loading ? 'Enviando...' : 'Enviar Link de Redefinição'}
                            </Button>
                        </div>
                    </form>
                    {message && <p className="mt-4 text-sm text-green-600 dark:text-green-400">{message}</p>}
                    {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
                    <div className="mt-4 text-center text-sm text-neutral-700 dark:text-neutral-200">
                        Lembrou da senha?{' '}
                        <Link to="/login" className="underline text-primary-600 dark:text-primary-400">
                            Fazer Login
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default ForgotPasswordPage;
