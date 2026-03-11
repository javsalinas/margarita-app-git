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
        <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center p-6 sm:p-12 font-['Inter'] overflow-x-hidden relative">
            {/* Background Grid Pattern - Subtle Neobrutalist touch */}
            <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1.5px, transparent 1.5px)', backgroundSize: '40px 40px' }}></div>

            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="w-full max-w-7xl flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20 z-10"
            >
                {/* Left Section: Harmonic Pixel Art Logo */}
                <div className="w-full lg:w-1/2 flex justify-center">
                    <motion.div
                        initial={{ x: -30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2, duration: 0.6, type: "spring", stiffness: 100 }}
                        className="relative"
                    >
                        <img 
                            src="/src/assets/logo-new.png" 
                            alt="Margarit.app Logo" 
                            className="w-64 h-64 sm:w-[420px] sm:h-[420px] object-contain drop-shadow-[16px_16px_0_rgba(0,0,0,0.1)] hover:scale-105 transition-transform duration-500 cursor-pointer" 
                        />
                    </motion.div>
                </div>

                {/* Right Section: Neobrutalist Login Card */}
                <div className="w-full lg:w-1/2 flex justify-center">
                    <motion.div
                        initial={{ x: 30, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.4, duration: 0.6, type: "spring", stiffness: 100 }}
                        className="bg-[#C5C5FF] border-[3px] border-black shadow-[16px_16px_0_0_#000000] p-10 sm:p-14 w-full max-w-[540px] relative"
                    >
                        {/* Title Section */}
                        <div className="mb-14 text-center sm:text-left">
                            <h1 className="text-3xl sm:text-5xl font-black text-black mb-4 uppercase leading-none font-['Archivo'] tracking-tight">
                                MARGARITA.APP
                            </h1>
                            <div className="h-[5px] w-20 bg-black mb-6 mx-auto sm:mx-0"></div>
                            <p className="text-black font-bold uppercase text-[10px] tracking-[0.4em] leading-tight font-['Inter']">
                                Design Tool Studio
                            </p>
                        </div>

                        {/* Login Options */}
                        <div className="space-y-6">
                            <button 
                                className="w-full h-16 bg-white border-[3px] border-black text-black hover:bg-white flex items-center justify-center gap-5 font-black text-sm uppercase shadow-[8px_8px_0_0_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0_0_#000000] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none transition-all group"
                                onClick={() => handleSocialLogin('google')}
                                disabled={isLoading}
                            >
                                <Mail className="w-6 h-6 group-hover:rotate-6 transition-transform" strokeWidth={3} />
                                <span>Entrar con Google</span>
                            </button>

                            <div className="flex items-center gap-4 py-4">
                                <div className="flex-1 h-[3px] bg-black opacity-10"></div>
                                <img src="/src/assets/daisy.png" alt="Separator" className="w-8 h-8 object-contain opacity-80 rotate-12" />
                                <div className="flex-1 h-[3px] bg-black opacity-10"></div>
                            </div>

                            <button 
                                className="w-full h-16 bg-[#FAF3DD] border-[3px] border-black text-black hover:bg-[#FAF3DD] flex items-center justify-center gap-5 font-black text-sm uppercase shadow-[8px_8px_0_0_#000000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[6px_6px_0_0_#000000] active:translate-x-[8px] active:translate-y-[8px] active:shadow-none transition-all group"
                                onClick={() => navigate('/editor/new')}
                                disabled={isLoading}
                            >
                                <User className="w-6 h-6 group-hover:rotate-6 transition-transform" strokeWidth={3} />
                                <span>Modo Invitado</span>
                            </button>
                        </div>

                        {/* Decorative Pixel Elements */}
                        <div className="mt-14 pt-10 border-t-[4px] border-black/10 flex items-center justify-between">
                            <div className="flex gap-3">
                                <div className="w-4 h-4 bg-black"></div>
                                <div className="w-4 h-4 bg-white"></div>
                                <div className="w-4 h-4 bg-[#FAF3DD]"></div>
                            </div>
                            <p className="text-[10px] font-black text-black/20 uppercase tracking-[0.3em] font-['Silkscreen']">v2.0.26</p>
                        </div>
                    </motion.div>
                </div>
            </motion.div>

            {/* Float Terms */}
            <div className="absolute bottom-10 w-full text-center">
                <p className="text-[10px] font-bold text-black/30 uppercase tracking-[0.3em]">
                    By entering, you agree to the <span className="text-black underline cursor-pointer hover:text-black/60 transition-colors">Terms of Service</span>
                </p>
            </div>
        </div>
    );
}
