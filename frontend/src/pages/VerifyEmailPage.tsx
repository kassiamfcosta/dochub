import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const VerifyEmailPage: React.FC = () => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [showCode, setShowCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState<string | undefined>();
  const { verifyEmail, resendVerificationCode } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const stateEmail = (location.state as any)?.email;
    const stateCode = (location.state as any)?.code;
    const storedEmail = localStorage.getItem('pendingVerificationEmail');
    
    if (stateEmail) {
      setEmail(stateEmail);
      localStorage.setItem('pendingVerificationEmail', stateEmail);
      
      // Se houver código no state (desenvolvimento), preenche automaticamente
      if (stateCode) {
        setVerificationCode(stateCode);
        setShowCode(true);
        const codeArray = stateCode.split('').slice(0, 6);
        setCode([...codeArray, ...Array(6 - codeArray.length).fill('')]);
      }
    } else if (storedEmail) {
      setEmail(storedEmail);
    } else {
      navigate('/register');
    }
  }, [location, navigate]);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newCode = [...code];
    newCode[index] = value.replace(/\D/g, '');
    setCode(newCode);

    // Move to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    pastedData.split('').forEach((char, index) => {
      if (index < 6) {
        newCode[index] = char;
      }
    });
    setCode(newCode);
    inputRefs.current[Math.min(pastedData.length, 5)]?.focus();
  };

  const handleResendCode = async () => {
    if (!email) return;
    
    setResending(true);
    setError('');
    setShowCode(false);
    setVerificationCode(undefined);

    try {
      const code = await resendVerificationCode(email);
      if (code) {
        setVerificationCode(code);
        setShowCode(true);
      }
      // Limpa os campos de código
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Erro ao reenviar código');
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    
    if (fullCode.length !== 6) {
      setError('Digite o código completo de 6 dígitos');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await verifyEmail(email, fullCode);
      localStorage.removeItem('pendingVerificationEmail');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Erro ao verificar email');
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-white px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="bg-primary-100 rounded-full p-4">
              <svg className="w-12 h-12 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h2 className="text-3xl font-bold text-neutral-900 mb-2">
            Verifique seu email
          </h2>
          <p className="text-neutral-600 mb-1">
            Enviamos um código de 6 dígitos para
          </p>
          <p className="text-primary-600 font-medium">{email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-error-light border border-error rounded-lg p-4 flex items-start gap-3 animate-slide-down">
              <svg className="w-5 h-5 text-error flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-error font-medium">{error}</p>
            </div>
          )}

          <div className="flex justify-center gap-2">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                className="w-12 h-14 text-center text-2xl font-semibold border-2 border-neutral-300 rounded-lg focus:border-primary-500 focus:ring-2 focus:ring-primary-200 transition-colors"
                autoFocus={index === 0}
              />
            ))}
          </div>

          <Button
            type="submit"
            loading={loading}
            disabled={code.join('').length !== 6}
            className="w-full"
            size="lg"
          >
            {loading ? 'Verificando...' : 'Verificar código'}
          </Button>

          <div className="text-center space-y-3">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={resending}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? 'Reenviando...' : 'Não recebeu o código? Reenviar'}
            </button>

            {showCode && verificationCode && (
              <Card className="mt-4 p-4 bg-primary-50 border-primary-200">
                <div className="text-center">
                  <p className="text-sm text-primary-700 font-medium mb-2">
                    Modo Desenvolvimento: Código de Verificação
                  </p>
                  <p className="text-2xl font-bold text-primary-900 tracking-wider">
                    {verificationCode}
                  </p>
                  <p className="text-xs text-primary-600 mt-2">
                    Este código aparece apenas em desenvolvimento
                  </p>
                </div>
              </Card>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
