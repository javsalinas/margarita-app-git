import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Mail, User } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { toast } from 'sonner';

export default function LoginPage() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    const handleSocialLogin = async (provider: 'google') => {
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
        <div className="min-h-screen bg-[var(--cream)] flex items-center justify-center p-6 relative overflow-hidden font-['Silkscreen']">
            
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="w-full max-w-[440px] z-10"
            >
                <div className="flex flex-col items-center mb-10 text-center">
                    {/* Isometric Logo Container with Daisy */}
                    <div className="w-24 h-24 bg-white border-[4px] border-black flex items-center justify-center mb-6 shadow-[8px_8px_0_rgba(0,0,0,1)] pixel-box-cream">
                        <img src="/src/assets/daisy.png" alt="Margarita Logo" className="w-16 h-16 object-contain" />
                    </div>
                    <h1 className="text-5xl font-black tracking-tighter text-black mb-2 uppercase drop-shadow-[4px_4px_0_var(--periwinkle)]">Margarita</h1>
                    <p className="text-black/60 font-bold uppercase text-[10px] tracking-[0.25em]">Design Tool Studio</p>
                </div>

                <div className="pixel-box bg-white p-8 shadow-[12px_12px_0_rgba(0,0,0,1)] relative border-[4px] border-black">
                    <div className="text-center mb-8 border-b-4 border-black pb-6">
                        <h2 className="text-xl font-bold uppercase mb-2">Acceso al Sistema</h2>
                        <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest leading-relaxed">Sincroniza tus fuentes y proyectos en la nube</p>
                    </div>

                    <div className="space-y-6">
                        <button 
                            className="w-full h-16 bg-white border-[4px] border-black text-black hover:bg-[var(--periwinkle)] transition-all flex items-center justify-center gap-4 font-bold text-sm uppercase shadow-[6px_6px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
                            onClick={() => handleSocialLogin('google')}
                            disabled={isLoading}
                        >
                            <Mail className="w-6 h-6" strokeWidth={3} />
                            Entrar con Google
                        </button>

                        <div className="relative flex items-center justify-center py-2">
                            <div className="absolute w-full h-[2px] bg-black opacity-10"></div>
                            <span className="relative bg-white px-4 text-[9px] font-bold text-black/30 uppercase tracking-[0.3em]">O TAMBIÉN</span>
                        </div>

                        <button 
                            className="w-full h-16 bg-[var(--cream)] border-[4px] border-black text-black hover:bg-[var(--cream-dark)] transition-all flex items-center justify-center gap-4 font-bold text-sm uppercase shadow-[6px_6px_0_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none"
                            onClick={() => navigate('/editor/new')}
                            disabled={isLoading}
                        >
                            <User className="w-6 h-6" strokeWidth={3} />
                            Modo Invitado
                        </button>
                    </div>

                    <div className="mt-8 text-center px-4">
                        <p className="text-[8px] text-black/40 font-bold leading-relaxed uppercase tracking-widest">
                            Al entrar, aceptas los términos de servicio de Margarita App.
                        </p>
                    </div>
                </div>

                <div className="mt-10 flex justify-center gap-4">
                    <div className="w-3 h-3 bg-black"></div>
                    <div className="w-3 h-3 bg-[var(--periwinkle)]"></div>
                    <div className="w-3 h-3 bg-[var(--cream-dark)]"></div>
                </div>
            </motion.div>
        </div>
    );
}
