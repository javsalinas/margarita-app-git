import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Upload, Copy, Check, Download, Type, Layers, Plus, Image as ImageIcon, Trash2, ClipboardPaste, Palette } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractColorsFromImage, getColorName } from '../utils/colorExtractor';
import { saveProject, getProject } from '../utils/storage';
import { generateTextSticker } from '../utils/fontLoader';
import { saveFontToDB, getAllFontsFromDB, deleteFontFromDB, registerFont } from '../utils/fontDatabase';
import { toast } from 'sonner';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent } from '../components/ui/card';

type Format = '9:16' | '1:1' | '4:5';
type Tab = 'color-studio' | 'font-studio';

interface Overlay {
    id: string;
    type: 'sticker';
    dataUrl: string;
    position: { x: number; y: number };
    scale: number;
}

export default function EditorPage() {
    const navigate = useNavigate();
    const { projectId } = useParams();
    
    // UI State
    const [activeTab, setActiveTab] = useState<Tab>('color-studio');
    const [projectName, setProjectName] = useState('Nuevo Proyecto');
    const [format, setFormat] = useState<Format>('9:16');
    const [image, setImage] = useState<string | null>(null);
    const [colors, setColors] = useState<string[]>([]);
    const [palettePosition, setPalettePosition] = useState({ x: 80, y: 15 });
    const [overlays, setOverlays] = useState<Overlay[]>([]);
    
    // Interaction State
    const [isDraggingPalette, setIsDraggingPalette] = useState(false);
    const [draggingOverlayId, setDraggingOverlayId] = useState<string | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [copiedColor, setCopiedColor] = useState<string | null>(null);

    // Font Studio State
    const [storedFonts, setStoredFonts] = useState<any[]>([]);
    const [selectedFontId, setSelectedFontId] = useState<string | null>(null);
    const [stickerText, setStickerText] = useState('Margarita');
    const [stickerColor, setStickerColor] = useState<'white' | 'black'>('white');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const fontInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const loadFonts = async () => {
            try {
                const fonts = await getAllFontsFromDB();
                for (const font of fonts) {
                    await registerFont(font);
                }
                setStoredFonts(fonts);
                if (fonts.length > 0) setSelectedFontId(fonts[0].id);
            } catch (error) {
                console.error('Error loading fonts:', error);
            }
        };
        loadFonts();

        if (projectId && projectId !== 'new') {
            const project = getProject(projectId);
            if (project) {
                setProjectName(project.name);
                setFormat(project.format);
                setImage(project.thumbnail);
                setColors(project.colors);
                setPalettePosition(project.palettePosition);
            }
        }
    }, [projectId]);

    useEffect(() => {
        const handlePaste = async (e: ClipboardEvent) => {
            if (activeTab !== 'color-studio') return;
            
            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const blob = item.getAsFile();
                    if (!blob) continue;

                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const dataUrl = event.target?.result as string;
                        const newOverlay: Overlay = {
                            id: crypto.randomUUID(),
                            type: 'sticker',
                            dataUrl,
                            position: { x: 50, y: 50 },
                            scale: 1,
                        };
                        setOverlays(prev => [...prev, newOverlay]);
                        toast.success('Sticker pegado');
                    };
                    reader.readAsDataURL(blob);
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [activeTab]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => setImage(event.target?.result as string);
        reader.readAsDataURL(file);

        try {
            const extractedColors = await extractColorsFromImage(file, 6);
            setColors(extractedColors.map(c => c.hex));
            setPalettePosition({ x: 80, y: 15 });
            toast.success('ADN Visual extraído');
        } catch (error) {
            toast.error('Error al analizar imagen');
        }
    };

    const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const id = await saveFontToDB(file);
            const fonts = await getAllFontsFromDB();
            const newFont = fonts.find(f => f.id === id);
            if (newFont) {
                await registerFont(newFont);
                setStoredFonts(fonts);
                setSelectedFontId(id);
                toast.success('Tipografía registrada');
            }
        } catch (error) {
            toast.error('Error al cargar fuente');
        }
    };

    const handleCopySticker = async () => {
        if (!selectedFontId) return toast.error('Selecciona una fuente');
        const dataUrl = generateTextSticker(stickerText, selectedFontId, stickerColor, 400);
        try {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast.success('Copiado. Pégalo en el Studio (Ctrl+V)');
        } catch (error) {
            toast.error('Error al procesar sticker');
        }
    };

    const handleDragStart = (id: string | 'palette') => {
        if (id === 'palette') setIsDraggingPalette(true);
        else setDraggingOverlayId(id);
    };

    const handleGlobalDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDraggingPalette && !draggingOverlayId) return;
        if (!canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

        const pxX = clientX - rect.left;
        const pxY = clientY - rect.top;

        const pctX = Math.max(0, Math.min(100, (pxX / rect.width) * 100));
        const pctY = Math.max(0, Math.min(100, (pxY / rect.height) * 100));

        if (isDraggingPalette) {
            setPalettePosition({ x: pctX, y: pctY });
        } else if (draggingOverlayId) {
            setOverlays(prev => prev.map(o => 
                o.id === draggingOverlayId ? { ...o, position: { x: pctX, y: pctY } } : o
            ));
        }
    }, [isDraggingPalette, draggingOverlayId]);

    const handleDragEnd = () => {
        setIsDraggingPalette(false);
        setDraggingOverlayId(null);
    };

    const handleSave = () => {
        if (!image || colors.length === 0) return toast.error('Lienzo vacío');
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

    const handleExport = async () => {
        if (!image || !canvasRef.current) return toast.error('Nada que exportar');
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = image;

        await new Promise((resolve) => { img.onload = resolve; });

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.drawImage(img, 0, 0);

        if (colors.length > 0) {
            const circleRadius = canvas.width * 0.06;
            const gap = circleRadius * 0.4;
            const startX = (palettePosition.x / 100) * canvas.width;
            const startY = (palettePosition.y / 100) * canvas.height;

            colors.forEach((color, idx) => {
                ctx.beginPath();
                ctx.arc(startX, startY + (idx * (circleRadius * 2 + gap)), circleRadius, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,0.3)';
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }

        for (const o of overlays) {
            const sImg = new Image();
            sImg.src = o.dataUrl;
            await new Promise((resolve) => { sImg.onload = resolve; });
            const sw = sImg.width * o.scale * (canvas.width / 440);
            const sh = sImg.height * o.scale * (canvas.width / 440);
            ctx.drawImage(sImg, (o.position.x / 100) * canvas.width - sw/2, (o.position.y / 100) * canvas.height - sh/2, sw, sh);
        }

        const link = document.createElement('a');
        link.download = `${projectName}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        toast.success('Alta Resolución exportada');
    };

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-[#FDFCFB] text-[#1D1D1F] select-none font-['Plus_Jakarta_Sans'] overflow-hidden flex flex-col" 
                 onMouseMove={handleGlobalDrag} 
                 onTouchMove={handleGlobalDrag}
                 onMouseUp={handleDragEnd}
                 onTouchEnd={handleDragEnd}>
                
                {/* Navbar Vaporwave Airy */}
                <header className="h-16 border-b border-[#E5E5E7] bg-white/70 backdrop-blur-xl sticky top-0 z-40 flex items-center px-6">
                    <div className="flex items-center gap-4 flex-1">
                        <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-100" onClick={() => navigate('/home')}>
                            <ArrowLeft size={20} />
                        </Button>
                        <div className="h-4 w-[1px] bg-[#E5E5E7] mx-1" />
                        <Input
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="bg-transparent border-none focus-visible:ring-0 text-sm font-semibold h-8 w-48 p-0"
                        />
                    </div>

                    <div className="hidden md:flex gap-2 mx-4 bg-slate-100 p-1 rounded-2xl border border-[#E5E5E7]">
                        <button onClick={() => setActiveTab('color-studio')} className={`h-9 px-6 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all ${activeTab === 'color-studio' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>Studio</button>
                        <button onClick={() => setActiveTab('font-studio')} className={`h-9 px-6 rounded-xl text-[10px] uppercase font-bold tracking-widest transition-all ${activeTab === 'font-studio' ? 'bg-white text-primary shadow-sm' : 'text-slate-500'}`}>Fonts</button>
                    </div>

                    <div className="flex items-center gap-2 flex-1 justify-end">
                        <Button variant="outline" size="sm" className="rounded-full text-xs font-bold border-[#E5E5E7]" onClick={handleSave}>Guardar</Button>
                        <Button size="sm" className="rounded-full bg-primary text-white text-xs font-bold px-6 hover:opacity-90 shadow-lg shadow-primary/20" onClick={handleExport}>
                            Exportar <Download className="w-3 h-3 ml-2" />
                        </Button>
                    </div>
                </header>

                <main className="flex-1 relative flex overflow-hidden">
                    {/* Left Sidebar */}
                    <aside className="hidden md:flex w-16 border-r border-[#E5E5E7] flex flex-col items-center py-6 gap-6 bg-white">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-primary hover:bg-slate-50" onClick={() => fileInputRef.current?.click()}>
                                    <ImageIcon size={20} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Imagen</TooltipContent>
                        </Tooltip>
                        <div className="h-[1px] w-8 bg-[#E5E5E7]" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-xl text-slate-400 hover:text-primary hover:bg-slate-50">
                                    <Layers size={20} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Capas</TooltipContent>
                        </Tooltip>
                    </aside>

                    {activeTab === 'color-studio' && (
                        <div className="flex-1 flex flex-col md:flex-row relative">
                            <div className="flex-1 flex flex-col items-center justify-center relative bg-[#F5F5F7] py-8 overflow-auto">
                                <div className="mb-6 flex gap-2 z-30 bg-white/80 backdrop-blur-md p-1 rounded-full border border-[#E5E5E7] shadow-sm">
                                    {(['9:16', '1:1', '4:5'] as Format[]).map((f) => (
                                        <button key={f} onClick={() => setFormat(f)} className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all ${format === f ? 'bg-primary text-white shadow-md' : 'text-[#86868B] hover:bg-white'}`}>{f}</button>
                                    ))}
                                </div>

                                <div className="relative">
                                    <div 
                                        ref={canvasRef} 
                                        className={`relative bg-white border border-white shadow-[0_40px_100px_rgba(0,0,0,0.08)] rounded-[40px] overflow-hidden ${format === '9:16' ? 'aspect-[9/16]' : format === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} w-[300px] sm:w-[440px] transition-all`}
                                    >
                                        {image ? <img src={image} className="absolute inset-0 w-full h-full object-cover" /> : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center m-8 border-2 border-dashed border-slate-200 rounded-[32px] cursor-pointer bg-slate-50" onClick={() => fileInputRef.current?.click()}>
                                                <Upload size={40} className="mb-4 text-slate-300" />
                                                <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">Upload Image</span>
                                            </div>
                                        )}
                                        
                                        {/* Staple Palette: Refined Airy Circles */}
                                        {colors.length > 0 && (
                                            <div 
                                                className="absolute z-40 flex flex-col gap-4 cursor-move p-4"
                                                style={{ top: `${palettePosition.y}%`, left: `${palettePosition.x}%`, transform: 'translate(-50%, -50%)' }}
                                                onMouseDown={() => handleDragStart('palette')}
                                                onTouchStart={() => handleDragStart('palette')}
                                            >
                                                {colors.map((color, idx) => (
                                                    <div 
                                                        key={idx} 
                                                        className="w-14 h-14 sm:w-16 sm:h-16 border-2 border-white/50 rounded-full shadow-2xl hover:scale-110 transition-transform cursor-pointer"
                                                        style={{ backgroundColor: color }}
                                                        onClick={(e) => { e.stopPropagation(); setSelectedColor(color); }}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {overlays.map((o) => (
                                            <div 
                                                key={o.id} 
                                                className={`absolute cursor-move z-30 ${draggingOverlayId === o.id ? 'outline-2 outline-dashed outline-primary p-1' : ''}`} 
                                                style={{ left: `${o.position.x}%`, top: `${o.position.y}%`, transform: 'translate(-50%, -50%)' }} 
                                                onMouseDown={() => handleDragStart(o.id)} 
                                                onTouchStart={() => handleDragStart(o.id)}
                                            >
                                                <img src={o.dataUrl} className="max-w-[200px] sm:max-w-[300px] pointer-events-none" style={{ transform: `scale(${o.scale})` }} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Sidebar Right (Airy System) */}
                            <aside className="hidden md:flex w-80 border-l border-[#E5E5E7] bg-white flex flex-col p-8 gap-8 z-30">
                                <div>
                                    <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] mb-6 text-slate-400">Visual DNA</h3>
                                    <div className="space-y-3">
                                        {colors.map((color, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-3 bg-[#FDFCFB] border border-[#E5E5E7] rounded-2xl hover:border-primary/30 transition-all cursor-pointer group" onClick={() => setSelectedColor(color)}>
                                                <div className="w-10 h-10 border border-[#E5E5E7] rounded-lg shadow-sm" style={{ backgroundColor: color }} />
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase mb-1">HEX</span>
                                                    <span className="font-['Archivo'] font-bold text-sm">{color}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex-1 flex flex-col">
                                    <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] mb-6 text-slate-400">Inventory</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {overlays.map(o => (
                                            <div key={o.id} className="aspect-square bg-slate-50 border border-[#E5E5E7] rounded-2xl p-3 relative group hover:bg-white transition-all">
                                                <img src={o.dataUrl} className="w-full h-full object-contain" />
                                                <button className="absolute top-2 right-2 w-6 h-6 bg-white/80 backdrop-blur-md rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-[#E5E5E7]" onClick={() => setOverlays(prev => prev.filter(ov => ov.id !== o.id))}><Trash2 size={10}/></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </aside>
                        </div>
                    )}

                    {activeTab === 'font-studio' && (
                        <div className="flex-1 flex flex-col md:flex-row z-20 relative bg-white">
                            <div className="w-full md:w-80 border-b md:border-b-0 md:border-r border-[#E5E5E7] p-8 flex flex-col gap-6">
                                <h3 className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">Type Vault</h3>
                                <Button variant="outline" className="rounded-2xl h-12" onClick={() => fontInputRef.current?.click()}><Plus size={16}/> Load .TTF</Button>
                                <div className="flex md:flex-col gap-4 overflow-x-auto md:overflow-y-auto pb-4 pr-2">
                                    {storedFonts.map((f) => (
                                        <div key={f.id} onClick={() => setSelectedFontId(f.id)} className={`p-4 border border-[#E5E5E7] rounded-2xl cursor-pointer shrink-0 w-40 md:w-full transition-all ${selectedFontId === f.id ? 'bg-primary text-white' : 'bg-[#FDFCFB] hover:border-primary/30'}`}>
                                            <p className="text-[9px] font-bold uppercase truncate opacity-60">{f.name}</p>
                                            <p style={{ fontFamily: f.id }} className="text-2xl truncate pt-2">Aa 123</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 p-8 sm:p-12 flex flex-col items-center justify-center bg-[#F5F5F7]">
                                <div className="bg-white w-full max-w-2xl p-10 border border-[#E5E5E7] rounded-[40px] shadow-airy flex flex-col gap-10">
                                    <div className="bg-checkered h-64 rounded-3xl flex items-center justify-center p-10 relative overflow-hidden border border-[#E5E5E7]">
                                        <p style={{ fontFamily: selectedFontId || 'sans-serif', color: stickerColor, fontSize: '5rem', textAlign: 'center' }}>{stickerText}</p>
                                        <div className="absolute top-4 left-4 bg-primary text-white text-[8px] px-3 py-1 rounded-full font-bold uppercase tracking-widest">Preview</div>
                                    </div>
                                    <div className="space-y-6">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-[10px] uppercase font-bold text-slate-400">Content</label>
                                            <Input value={stickerText} onChange={(e) => setStickerText(e.target.value)} className="h-14 bg-slate-50 border-none rounded-2xl text-lg font-semibold" />
                                        </div>
                                        <div className="flex gap-4">
                                            <Button variant="outline" onClick={() => setStickerColor('white')} className={`flex-1 rounded-xl ${stickerColor === 'white' ? 'bg-primary text-white' : ''}`}>Light</Button>
                                            <Button variant="outline" onClick={() => setStickerColor('black')} className={`flex-1 rounded-xl ${stickerColor === 'black' ? 'bg-primary text-white' : ''}`}>Dark</Button>
                                        </div>
                                        <Button className="w-full h-16 bg-[#1D1D1F] text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-black" onClick={handleCopySticker}><ClipboardPaste size={20} className="mr-2" /> Copy to Studio</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                {/* Mobile Menu Airy */}
                <footer className="md:hidden h-20 border-t border-[#E5E5E7] bg-white/80 backdrop-blur-xl sticky bottom-0 z-50 flex items-center px-6 overflow-x-auto gap-6 no-scrollbar">
                    <button onClick={() => setActiveTab('color-studio')} className={`flex flex-col items-center gap-1 shrink-0 ${activeTab === 'color-studio' ? 'text-primary' : 'text-slate-300'}`}><Palette size={20}/><span className="text-[8px] font-bold uppercase">Studio</span></button>
                    <button onClick={() => setActiveTab('font-studio')} className={`flex flex-col items-center gap-1 shrink-0 ${activeTab === 'font-studio' ? 'text-primary' : 'text-slate-300'}`}><Type size={20}/><span className="text-[8px] font-bold uppercase">Fonts</span></button>
                    <div className="w-0.5 h-10 bg-black opacity-10 shrink-0" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 shrink-0 text-slate-400"><ImageIcon size={20}/><span className="text-[8px] font-bold uppercase">Upload</span></button>
                    <div className="w-0.5 h-10 bg-black opacity-10 shrink-0" />
                    <div className="flex gap-3 shrink-0 pr-6">
                        {colors.map((c, i) => <div key={i} onClick={() => setSelectedColor(c)} className="w-10 h-10 rounded-full border border-white shadow-md" style={{ backgroundColor: c }} />)}
                    </div>
                </footer>

                <Dialog open={!!selectedColor} onOpenChange={(open) => !open && setSelectedColor(null)}>
                    <DialogContent className="max-w-sm p-10 border-none rounded-[40px] bg-white shadow-2xl">
                        <DialogHeader className="mb-8 text-center uppercase tracking-widest text-[10px] font-bold text-slate-400">Cromatic Analysis</DialogHeader>
                        <div className="space-y-8 flex flex-col items-center">
                            <div className="w-32 h-32 border border-white rounded-[32px] shadow-xl" style={{ backgroundColor: selectedColor || '' }} />
                            <div className="flex gap-2 w-full">
                                <Input value={selectedColor || ''} readOnly className="h-14 bg-slate-50 border-none rounded-2xl font-mono text-center flex-1" />
                                <Button
                                    onClick={() => { navigator.clipboard.writeText(selectedColor || ''); setCopiedColor(selectedColor); toast.success('Copiado'); setTimeout(() => setCopiedColor(null), 2000); }} 
                                    className="w-14 h-14 bg-primary text-white rounded-2xl"
                                >
                                    {copiedColor === selectedColor ? <Check size={20} /> : <Copy size={20} />}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <input ref={fontInputRef} type="file" accept=".ttf,.otf" className="hidden" onChange={handleFontUpload} />
            </div>
        </TooltipProvider>
    );
}
