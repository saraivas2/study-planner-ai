import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { BookOpen, Mail, Lock, User, ArrowRight, Loader2, AlertCircle, Check, X } from 'lucide-react';
import { registerSchema, loginSchema } from '@/lib/validations';
import { checkRateLimit, recordFailedAttempt, clearLoginAttempts } from '@/lib/rateLimit';
import { z } from 'zod';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const { user, signIn, signUp } = useAuth();
  const navigate = useNavigate();

  // Password strength indicators
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Check rate limit when email changes (debounced)
  useEffect(() => {
    if (!isLogin || !email) return;

    const timer = setTimeout(async () => {
      const result = await checkRateLimit(email);
      setIsBlocked(result.blocked);
      setBlockMessage(result.message);
    }, 500);

    return () => clearTimeout(timer);
  }, [email, isLogin]);

  const validateForm = (): boolean => {
    setErrors({});
    
    try {
      if (isLogin) {
        loginSchema.parse({ email, password });
      } else {
        registerSchema.parse({ fullName, email, password });
      }
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: { [key: string]: string } = {};
        error.errors.forEach((err) => {
          const field = err.path[0] as string;
          newErrors[field] = err.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    if (isLogin && isBlocked) {
      toast.error(blockMessage || 'Conta bloqueada temporariamente. Tente novamente mais tarde.');
      return;
    }

    setIsLoading(true);

    try {
      if (isLogin) {
        // Check rate limit before attempting login
        const rateLimitCheck = await checkRateLimit(email);
        if (rateLimitCheck.blocked) {
          setIsBlocked(true);
          setBlockMessage(rateLimitCheck.message);
          toast.error(rateLimitCheck.message || 'Conta bloqueada temporariamente.');
          setIsLoading(false);
          return;
        }

        const { error } = await signIn(email, password);
        if (error) {
          // Record failed attempt
          const result = await recordFailedAttempt(email);
          
          if (result.blocked) {
            setIsBlocked(true);
            setBlockMessage('Conta bloqueada por 5 minutos após 3 tentativas falhas.');
            toast.error('Conta bloqueada por 5 minutos após 3 tentativas falhas.');
          } else if (error.message.includes('Invalid login credentials')) {
            const attemptsLeft = 3 - (result.failedAttempts || 0);
            toast.error(`Credenciais inválidas. ${attemptsLeft > 0 ? `${attemptsLeft} tentativa(s) restante(s).` : ''}`);
          } else {
            toast.error(error.message);
          }
        } else {
          await clearLoginAttempts(email);
          toast.success('Login realizado com sucesso!');
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) {
          if (error.message.includes('User already registered')) {
            toast.error('Este email já está cadastrado. Tente fazer login.');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Conta criada com sucesso! Bem-vindo ao StudyFlow!');
          navigate('/');
        }
      }
    } catch (err) {
      toast.error('Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const PasswordStrengthIndicator = () => {
    if (isLogin || !password) return null;
    
    return (
      <div className="space-y-2 mt-2 p-3 bg-muted/50 rounded-lg">
        <p className="text-xs font-medium text-muted-foreground">Requisitos da senha:</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs">
            {hasMinLength ? (
              <Check className="w-3 h-3 text-success" />
            ) : (
              <X className="w-3 h-3 text-muted-foreground" />
            )}
            <span className={hasMinLength ? 'text-success' : 'text-muted-foreground'}>
              Mínimo 8 caracteres
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {hasUppercase ? (
              <Check className="w-3 h-3 text-success" />
            ) : (
              <X className="w-3 h-3 text-muted-foreground" />
            )}
            <span className={hasUppercase ? 'text-success' : 'text-muted-foreground'}>
              Uma letra maiúscula
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {hasNumber ? (
              <Check className="w-3 h-3 text-success" />
            ) : (
              <X className="w-3 h-3 text-muted-foreground" />
            )}
            <span className={hasNumber ? 'text-success' : 'text-muted-foreground'}>
              Um número
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden" style={{ background: 'var(--gradient-hero)' }}>
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative z-10 flex flex-col justify-center items-center p-12 text-center">
          <div className="animate-float mb-8">
            <div className="w-24 h-24 rounded-2xl bg-accent/20 backdrop-blur-sm flex items-center justify-center shadow-glow">
              <BookOpen className="w-12 h-12 text-accent" />
            </div>
          </div>
          
          <h1 className="text-5xl font-bold text-primary-foreground mb-4">
            StudyFlow
          </h1>
          <p className="text-xl text-primary-foreground/80 max-w-md leading-relaxed">
            Organize seus estudos com inteligência artificial. 
            Maximize seu potencial acadêmico.
          </p>
          
          <div className="mt-12 grid grid-cols-2 gap-6 max-w-sm">
            <div className="glass-card rounded-xl p-4 text-left">
              <div className="text-3xl font-bold text-accent">IA</div>
              <div className="text-sm text-primary-foreground/70">Sugestões Inteligentes</div>
            </div>
            <div className="glass-card rounded-xl p-4 text-left">
              <div className="text-3xl font-bold text-accent">50min</div>
              <div className="text-sm text-primary-foreground/70">Blocos de Estudo</div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -bottom-32 -left-32 w-64 h-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center shadow-lg">
              <BookOpen className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-foreground">
              {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
            </h2>
            <p className="text-muted-foreground mt-2">
              {isLogin 
                ? 'Entre para continuar seus estudos' 
                : 'Comece sua jornada de aprendizado'}
            </p>
          </div>

          {/* Block Warning */}
          {isBlocked && isLogin && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Conta bloqueada temporariamente</p>
                <p className="text-xs text-destructive/80 mt-1">
                  {blockMessage || 'Aguarde 5 minutos antes de tentar novamente.'}
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2 animate-fade-in">
                <Label htmlFor="fullName" className="text-foreground font-medium">
                  Nome Completo
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Seu nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className={`pl-10 ${errors.fullName ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.fullName && (
                  <p className="text-xs text-destructive">{errors.fullName}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`pl-10 ${errors.email ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 ${errors.password ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password}</p>
              )}
              <PasswordStrengthIndicator />
            </div>

            <Button
              type="submit"
              variant="accent"
              size="lg"
              className="w-full"
              disabled={isLoading || (isLogin && isBlocked)}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isLogin ? 'Entrar' : 'Criar Conta'}
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
                setIsBlocked(false);
                setBlockMessage(null);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {isLogin ? (
                <>
                  Não tem conta?{' '}
                  <span className="text-accent font-semibold">Cadastre-se</span>
                </>
              ) : (
                <>
                  Já tem conta?{' '}
                  <span className="text-accent font-semibold">Entrar</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
