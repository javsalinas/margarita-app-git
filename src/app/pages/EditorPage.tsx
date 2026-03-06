import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Upload, Copy, Check, Download, Type, Sparkles, Layers, Plus, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractColorsFromImage } from '../utils/colorExtractor';
import { saveProject, getProject, getUser } from '../utils/storage';
import { loadCustomFont, generateTextSticker } from '../utils/fontLoader';
import { toast } from 'sonner';

// UI Components from base repo
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

type Format = '9:16' | '1:1' | '4:5';

export default function EditorPage() {
    const navigate = useNavigate();
    const { projectId } = useParams();
    
    // Fallback user for Phase 1
    const user = getUser() || { id: 'guest', name: 'Guest User', email: 'guest@example.com' };

    const [projectName, setProjectName] = useState('Nuevo Proyecto');
    const [format, setFormat] = useState<Format>('9:16');
    const [image, setImage] = useState<string | null>(null);
    const [colors, setColors] = useState<string[]>([]);
    const [palettePosition, setPalettePosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [copiedColor, setCopiedColor] = useState<string | null>(null);

    // Font Lab States
    const [isFontLabOpen, setIsFontLabOpen] = useState(false);
    const [customFont, setCustomFont] = useState<string | null>(null);
    const [stickerText, setStickerText] = useState('Margarita');
    const [stickerColor, setStickerColor] = useState<'white' | 'black'>('white');
    const [stickers, setStickers] = useState<string[]>([]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const fontInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (projectId && projectId !== 'new') {
            const project = getProject(projectId);
            if (project) {
                setProjectName(project.name);
                setFormat(project.format);
                setImage(project.thumbnail);
                setColors(project.colors);
                setPalettePosition(project.palettePosition);
            }
        } else {
            setPalettePosition({ x: 80, y: 10 });
        }
    }, [projectId]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setImage(event.target?.result as string);
        };
        reader.readAsDataURL(file);

        try {
            const extractedColors = await extractColorsFromImage(file, 6);
            setColors(extractedColors.map(c => c.hex));
            toast.success('Colores extraídos exitosamente');
        } catch (error) {
            toast.error('Error al extraer colores');
            console.error(error);
        }
    };

    const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const fontName = `font-${Date.now()}`;
        try {
            await loadCustomFont(fontName, file);
            setCustomFont(fontName);
            toast.success('Tipografía cargada correctamente');
        } catch (error) {
            toast.error('Error al cargar la tipografía');
            console.error(error);
        }
    };

    const handleGenerateSticker = () => {
        if (!customFont) {
            toast.error('Primero sube una tipografía');
            return;
        }
        const stickerData = generateTextSticker(stickerText, customFont, stickerColor);
        setStickers([stickerData, ...stickers]);
        toast.success('Sticker generado');
    };

    const downloadSticker = (dataUrl: string) => {
        const link = document.createElement('a');
        link.download = `sticker-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
    };

    const handleLongPressStart = () => {
        longPressTimer.current = setTimeout(() => {
            setIsDragging(true);
        }, 500);
    };

    const handleLongPressEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
        setIsDragging(false);
    };

    const handlePaletteDrag = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDragging || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        let clientX: number, clientY: number;

        if ('touches' in e) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = ((clientX - rect.left) / rect.width) * 100;
        const y = ((clientY - rect.top) / rect.height) * 100;

        setPalettePosition({
            x: Math.max(0, Math.min(95, x)),
            y: Math.max(0, Math.min(85, y))
        });
    };

    const handleColorClick = (color: string) => {
        if (!isDragging) {
            setSelectedColor(color);
        }
    };

    const handleCopyColor = (color: string) => {
        navigator.clipboard.writeText(color);
        setCopiedColor(color);
        toast.success(`Color ${color} copiado`);

        setTimeout(() => {
            setCopiedColor(null);
        }, 2000);
    };

    const handleSave = () => {
        if (!image || colors.length === 0) {
            toast.error('Necesitas una imagen y colores extraídos');
            return;
        }

        const project = {
            id: projectId && projectId !== 'new' ? projectId : crypto.randomUUID(),
            name: projectName,
            thumbnail: image,
            colors,
            format,
            palettePosition,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        };

        saveProject(project);
        toast.success('Proyecto guardado');
    };

    const getCanvasAspectRatio = () => {
        switch (format) {
            case '9:16': return 'aspect-[9/16]';
            case '1:1': return 'aspect-square';
            case '4:5': return 'aspect-[4/5]';
        }
    };

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-[#FCFBFF] text-[#1D1D1F]">
                {/* Header Superior (Moderno & Airy) */}
                <header className="h-16 border-b border-[#E5E5E7] bg-white sticky top-0 z-40 flex items-center px-6">
                    <div className="flex items-center gap-4 flex-1">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-[#F5F5F7]" onClick={() => navigate('/home')}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div className="h-4 w-[1px] bg-[#E5E5E7] mx-1" />
                        <Input
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="bg-transparent border-none focus-visible:ring-0 text-sm font-semibold h-8 w-48 p-0"
                        />
                        <Badge variant="secondary" className="bg-[#E9E9FF] text-[#6362D7] border-none font-bold text-[10px] px-2 py-0">PRO</Badge>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="rounded-full text-xs font-bold text-[#86868B] hover:text-[#1D1D1F]" onClick={handleSave}>
                            Guardar borrador
                        </Button>
                        <Button size="sm" className="rounded-full bg-[#9291FF] text-white text-xs font-bold px-6 hover:bg-[#7A79E6] transition-all shadow-sm">
                            Exportar <Download className="w-3 h-3 ml-2" />
                        </Button>
                    </div>
                </header>

                {/* Área Principal */}
                <main className="h-[calc(100vh-64px)] relative flex overflow-hidden">
                    
                    {/* Panel Lateral Izquierdo */}
                    <aside className="w-16 border-r border-[#E5E5E7] flex flex-col items-center py-6 gap-6 bg-white">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-xl text-[#86868B] hover:text-[#9291FF] hover:bg-[#E9E9FF]" onClick={() => setIsFontLabOpen(true)}>
                                    <Type className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right"><p>Motor de Caligrafía</p></TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-xl text-[#86868B] hover:text-[#9291FF] hover:bg-[#E9E9FF]" onClick={() => fileInputRef.current?.click()}>
                                    <ImageIcon className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right"><p>Cambiar Imagen</p></TooltipContent>
                        </Tooltip>

                        <div className="h-[1px] w-8 bg-[#E5E5E7]" />

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-xl text-[#86868B] hover:text-[#9291FF] hover:bg-[#E9E9FF]">
                                    <Layers className="w-5 h-5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right"><p>Capas</p></TooltipContent>
                        </Tooltip>
                    </aside>

                    {/* Canvas (Lienzo) de Edición */}
                    <div className="flex-1 bg-[#F9F9FB] p-12 flex items-center justify-center overflow-auto">
                        <div className="relative flex flex-col items-center gap-8">
                            {/* Format Selector Flotante */}
                            <div className="bg-white p-1 rounded-full border border-[#E5E5E7] shadow-sm flex gap-1">
                                {(['9:16', '1:1', '4:5'] as Format[]).map((f) => (
                                    <button
                                        key={f}
                                        onClick={() => setFormat(f)}
                                        className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${
                                            format === f 
                                            ? 'bg-[#9291FF] text-white shadow-md' 
                                            : 'text-[#86868B] hover:bg-[#F5F5F7]'
                                        }`}
                                    >
                                        {f === '9:16' ? 'Story' : f === '1:1' ? 'Square' : 'Feed'}
                                    </button>
                                ))}
                            </div>

                            {/* El Lienzo Propiamente Dicho */}
                            <div className="bg-white p-1 rounded-[42px] shadow-[0_20px_50px_rgba(146,145,255,0.1)] border border-[#E5E5E7]">
                                <div
                                    ref={canvasRef}
                                    className={`relative ${getCanvasAspectRatio()} w-[360px] bg-[#F5F5F7] rounded-[40px] overflow-hidden group transition-all duration-500`}
                                    onMouseMove={handlePaletteDrag}
                                    onTouchMove={handlePaletteDrag}
                                    onMouseUp={handleLongPressEnd}
                                    onTouchEnd={handleLongPressEnd}
                                >
                                    {image ? (
                                        <img src={image} alt="Canvas" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-[#86868B] gap-4 bg-white" onClick={() => fileInputRef.current?.click()}>
                                            <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center">
                                                <Upload className="w-6 h-6 opacity-40" />
                                            </div>
                                            <p className="text-[10px] font-bold tracking-widest uppercase">Subir imagen</p>
                                        </div>
                                    )}

                                    {/* Paleta Inteligente (Staple) */}
                                    {colors.length > 0 && (
                                        <motion.div
                                            className="absolute flex flex-col gap-2 cursor-pointer z-20"
                                            style={{ left: `${palettePosition.x}%`, top: `${palettePosition.y}%` }}
                                            animate={{ scale: isDragging ? 1.05 : 1 }}
                                            onMouseDown={handleLongPressStart}
                                            onTouchStart={handleLongPressStart}
                                        >
                                            {colors.map((color, idx) => (
                                                <motion.div
                                                    key={idx}
                                                    className="w-10 h-10 rounded-full border-[3px] border-white shadow-lg"
                                                    style={{ backgroundColor: color }}
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleColorClick(color)}
                                                />
                                            ))}
                                            <AnimatePresence>
                                                {isDragging && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        exit={{ opacity: 0, y: 10 }}
                                                        className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-[#1D1D1F] text-white text-[9px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap shadow-xl"
                                                    >
                                                        REPOSICIONANDO
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Panel Lateral Derecho */}
                    <aside className="w-80 border-l border-[#E5E5E7] bg-white flex flex-col overflow-auto">
                        <div className="p-8 space-y-10">
                            
                            <section>
                                <h3 className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em] mb-4">Imagen Maestra</h3>
                                <Card className="border-[#E5E5E7] shadow-none bg-[#F5F5F7] rounded-3xl overflow-hidden group border-dashed hover:border-[#9291FF] transition-colors">
                                    <CardContent className="p-0">
                                        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                                        <button 
                                            className="w-full h-40 flex flex-col items-center justify-center gap-2 hover:bg-white transition-all text-[#86868B]"
                                            onClick={() => fileInputRef.current?.click()}
                                        >
                                            {image ? (
                                                <div className="relative w-full h-full group">
                                                    <img src={image} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#9291FF]/10">
                                                        <Sparkles className="text-[#9291FF]" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <Upload size={20} className="opacity-40" />
                                                    <span className="text-[10px] font-bold">IMPORTAR</span>
                                                </>
                                            )}
                                        </button>
                                    </CardContent>
                                </Card>
                            </section>

                            {colors.length > 0 && (
                                <section>
                                    <h3 className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em] mb-4">Paleta de Color</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        {colors.map((color, idx) => (
                                            <button
                                                key={idx}
                                                className="flex items-center gap-3 p-2 rounded-2xl hover:bg-[#F5F5F7] transition-all group border border-transparent hover:border-[#E5E5E7]"
                                                onClick={() => handleColorClick(color)}
                                            >
                                                <div className="w-7 h-7 rounded-full shadow-sm border border-white" style={{ backgroundColor: color }} />
                                                <span className="text-[10px] font-mono font-bold text-[#86868B] group-hover:text-[#1D1D1F]">{color}</span>
                                            </button>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-[10px] font-bold text-[#86868B] uppercase tracking-[0.2em]">Stickers Caligráficos</h3>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full hover:bg-[#E9E9FF] text-[#9291FF]" onClick={() => setIsFontLabOpen(true)}><Plus size={14}/></Button>
                                </div>
                                
                                {stickers.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-4">
                                        {stickers.map((sticker, idx) => (
                                            <div 
                                                key={idx} 
                                                className="aspect-square bg-[#F5F5F7] rounded-3xl flex items-center justify-center p-4 relative group cursor-pointer hover:bg-white border border-transparent hover:border-[#E5E5E7] transition-all shadow-sm"
                                                onClick={() => downloadSticker(sticker)}
                                            >
                                                <img src={sticker} alt="Sticker" className="max-w-full max-h-full object-contain" />
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Download className="w-3 h-3 text-[#9291FF]" />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-10 border border-dashed border-[#E5E5E7] rounded-[32px] flex flex-col items-center gap-3 text-center bg-[#F9F9FB]">
                                        <Type size={24} className="text-[#D1D1D6]" />
                                        <p className="text-[10px] font-bold text-[#86868B] uppercase leading-relaxed">Sin stickers generados</p>
                                    </div>
                                )}
                            </section>

                        </div>
                    </aside>
                </main>

                {/* Font Lab Modal */}
                <Dialog open={isFontLabOpen} onOpenChange={setIsFontLabOpen}>
                    <DialogContent className="max-w-4xl p-0 border-none rounded-[32px] overflow-hidden bg-white shadow-2xl">
                        <div className="flex flex-col md:flex-row h-[550px]">
                            {/* Previsualización */}
                            <div className="flex-1 bg-[#F9F9FB] flex items-center justify-center relative p-12">
                                <div className="absolute top-8 left-8 text-[#86868B] text-[9px] font-bold uppercase tracking-[0.2em]">Preview Area</div>
                                <div className="sticker-preview p-20 bg-checkered rounded-[32px] max-w-full overflow-hidden shadow-sm border border-[#E5E5E7]">
                                    <p style={{ fontFamily: customFont || 'sans-serif', color: stickerColor, fontSize: '80px', lineHeight: 1, textAlign: 'center' }}>
                                        {stickerText}
                                    </p>
                                </div>
                            </div>

                            {/* Controles */}
                            <div className="w-full md:w-[360px] p-10 flex flex-col gap-10 bg-white border-l border-[#E5E5E7]">
                                <DialogHeader>
                                    <DialogTitle className="text-2xl font-bold tracking-tight text-[#1D1D1F]">Font Lab</DialogTitle>
                                    <p className="text-[11px] text-[#86868B] font-medium leading-relaxed">Carga tus propias fuentes y crea stickers PNG con transparencia.</p>
                                </DialogHeader>

                                <div className="space-y-8">
                                    <div>
                                        <label className="text-[9px] font-bold text-[#86868B] uppercase tracking-[0.2em] block mb-4">1. Tipografía (.ttf / .otf)</label>
                                        <input ref={fontInputRef} type="file" accept=".ttf,.otf,.woff,.woff2" className="hidden" onChange={handleFontUpload} />
                                        <Button 
                                            variant="outline"
                                            className={`w-full h-12 rounded-2xl border-[#E5E5E7] text-xs font-bold transition-all shadow-sm ${customFont ? 'bg-[#E9E9FF] border-[#9291FF] text-[#6362D7]' : 'bg-white hover:bg-[#F5F5F7]'}`}
                                            onClick={() => fontInputRef.current?.click()}
                                        >
                                            {customFont ? 'Fuente Cargada' : 'Seleccionar archivo'}
                                        </Button>
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-bold text-[#86868B] uppercase tracking-[0.2em] block mb-4">2. Contenido del Sticker</label>
                                        <Input 
                                            value={stickerText}
                                            onChange={(e) => setStickerText(e.target.value)}
                                            className="h-12 bg-[#F5F5F7] border-none rounded-2xl font-semibold px-5 focus-visible:ring-1 focus-visible:ring-[#9291FF]"
                                            placeholder="Escribe algo..."
                                        />
                                    </div>

                                    <div>
                                        <label className="text-[9px] font-bold text-[#86868B] uppercase tracking-[0.2em] block mb-4">3. Variante Cromática</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {(['white', 'black'] as const).map(c => (
                                                <button
                                                    key={c}
                                                    onClick={() => setStickerColor(c)}
                                                    className={`h-12 rounded-2xl border transition-all flex items-center justify-center gap-3 ${stickerColor === c ? 'border-[#9291FF] bg-[#E9E9FF] text-[#6362D7]' : 'border-[#E5E5E7] bg-white hover:bg-[#F5F5F7]'}`}
                                                >
                                                    <div className={`w-4 h-4 rounded-full ${c === 'white' ? 'bg-white border border-[#E5E5E7]' : 'bg-[#1D1D1F]'}`} />
                                                    <span className="text-[10px] font-bold uppercase">{c === 'white' ? 'Luz' : 'Sombra'}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <Button 
                                    className="mt-auto h-14 bg-[#9291FF] text-white rounded-[20px] font-bold text-sm shadow-lg hover:bg-[#7A79E6] transition-all"
                                    onClick={handleGenerateSticker}
                                >
                                    Generar Sticker
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Color Detail Modal */}
                <Dialog open={!!selectedColor} onOpenChange={(open) => !open && setSelectedColor(null)}>
                    <DialogContent className="max-w-sm p-10 rounded-[32px] border-none shadow-2xl bg-white">
                        <DialogHeader className="mb-8 text-center">
                            <DialogTitle className="text-xl font-bold tracking-tight text-[#1D1D1F]">Análisis Cromático</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-8">
                            <div className="w-full h-40 rounded-[24px] shadow-sm border border-[#E5E5E7]" style={{ backgroundColor: selectedColor || '' }} />

                            <div>
                                <label className="text-[9px] font-bold text-[#86868B] uppercase tracking-[0.2em] mb-4 block text-center">Código HEX</label>
                                <div className="flex gap-2">
                                    <Input
                                        value={selectedColor || ''}
                                        readOnly
                                        className="h-14 bg-[#F5F5F7] border-none rounded-2xl font-mono font-bold text-center text-lg"
                                    />
                                    <Button
                                        onClick={() => handleCopyColor(selectedColor || '')}
                                        className="h-14 w-14 rounded-2xl bg-[#9291FF] text-white hover:bg-[#7A79E6] transition-all shadow-sm"
                                    >
                                        {copiedColor === selectedColor ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

            </div>
        </TooltipProvider>
    );
}
