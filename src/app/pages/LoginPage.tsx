import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Sparkles, Github, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { supabase } from '../utils/supabase';
import { toast } from 'sonner';

export default function LoginPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const handleSocialLogin = async (provider: 'google' | 'github') => {
        setIsLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/home`
                }
            });
            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message || 'Error al iniciar sesión');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Elementos Decorativos Airy */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-50 rounded-full blur-[120px] opacity-50" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-50 rounded-full blur-[120px] opacity-50" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="w-full max-w-[440px] z-10"
            >
                <div className="flex flex-col items-center mb-12">
                    <div className="w-16 h-16 bg-white rounded-[24px] shadow-xl flex items-center justify-center mb-6 border border-[#E5E5E7]">
                        <Sparkles className="w-8 h-8 text-[#1D1D1F]" />
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight text-[#1D1D1F] mb-2 font-['Syne']">Margarita</h1>
                    <p className="text-[#86868B] font-medium uppercase text-[10px] tracking-[0.2em]">Herramienta Editorial Pro</p>
                </div>

                <Card className="border-none shadow-[0_40px_100px_rgba(0,0,0,0.06)] rounded-[40px] bg-white/80 backdrop-blur-xl p-4">
                    <CardHeader className="pt-8 pb-4 text-center">
                        <CardTitle className="text-xl font-bold">Bienvenido de nuevo</CardTitle>
                        <CardDescription className="text-xs">Sincroniza tus diseños y fuentes en la nube.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pb-8">
                        <Button 
                            variant="outline" 
                            className="w-full h-14 rounded-2xl border-[#E5E5E7] hover:bg-[#F5F5F7] transition-all flex items-center gap-3 font-bold text-sm"
                            onClick={() => handleSocialLogin('github')}
                            disabled={isLoading}
                        >
                            <Github className="w-5 h-5" />
                            Continuar con GitHub
                        </Button>
                        <Button 
                            className="w-full h-14 rounded-2xl bg-[#1D1D1F] text-white hover:bg-black transition-all flex items-center gap-3 font-bold text-sm shadow-xl"
                            onClick={() => handleSocialLogin('google' as any)} // Google handled as example
                            disabled={isLoading}
                        >
                            <Mail className="w-5 h-5" />
                            Continuar con Google
                        </Button>
                        
                        <div className="pt-4 text-center">
                            <p className="text-[10px] text-[#86868B] leading-relaxed px-8">
                                Al continuar, aceptas los términos de servicio y la política de privacidad de Margarita App.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="mt-12 text-center">
                    <button 
                        onClick={() => navigate('/editor/new')}
                        className="text-xs font-bold text-[#86868B] hover:text-[#1D1D1F] transition-colors uppercase tracking-widest"
                    >
                        O entrar como invitado
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
