import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Upload, Copy, Check, Download, Type, Layers, Plus, Image as ImageIcon, Trash2, ClipboardPaste, Palette, RotateCw, Maximize2, X, Settings2, Maximize } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractColorsFromImage, getColorName } from '../utils/colorExtractor';
import { saveProject, getProject } from '../utils/storage';
import { generateTextSticker } from '../utils/fontLoader';
import { saveFontToDB, getAllFontsFromDB, deleteFontFromDB, registerFont } from '../utils/fontDatabase';
import { toast } from 'sonner';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger, PopoverAnchor } from '../components/ui/popover';
import { Drawer, DrawerContent, DrawerTrigger, DrawerHeader, DrawerTitle } from '../components/ui/drawer';
import { Slider } from '../components/ui/slider';

const DaisyLogo = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
        <path d="M12,2L14.39,5.26C14.61,5.57 14.97,5.74 15.35,5.74H19.35L19.35,9.74C19.35,10.12 19.52,10.48 19.83,10.7L23.09,13.09L20.7,15.48C20.48,15.7 20.31,16.06 20.31,16.44V20.44H16.31C15.93,20.44 15.57,20.61 15.35,20.92L12.96,24.18L10.57,20.92C10.35,20.61 9.99,20.44 9.61,20.44H5.61V16.44C5.61,16.06 5.44,15.7 5.13,15.48L1.87,13.09L5.13,10.7C5.44,10.48 5.61,10.12 5.61,9.74V5.74H9.61C9.99,5.74 10.35,5.57 10.57,5.26L12.96,2L12,2Z" />
        <circle cx="12" cy="13" r="3" fill="white" />
    </svg>
);

type Format = '9:16' | '1:1' | '4:5';
type Tab = 'color-studio' | 'font-studio';

interface Overlay {
    id: string;
    type: 'sticker';
    dataUrl: string;
    position: { x: number; y: number };
    scale: number;
    rotation: number;
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
    const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
    const [isResizing, setIsResizing] = useState<boolean>(false);
    const [isRotating, setIsRotating] = useState<boolean>(false);
    const [initialTransform, setInitialTransform] = useState<{ scale: number, rotation: number, mouseX: number, mouseY: number } | null>(null);
    const [selectedColor, setSelectedColor] = useState<string | null>(null);
    const [copiedColor, setCopiedColor] = useState<string | null>(null);
    const [isShiftPressed, setIsShiftPressed] = useState(false);

    // Font Studio State
    const [storedFonts, setStoredFonts] = useState<any[]>([]);
    const [selectedFontId, setSelectedFontId] = useState<string | null>(null);
    const [stickerText, setStickerText] = useState('Pruébame!');
    const [stickerColor, setStickerColor] = useState<'white' | 'black'>('white');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const fontInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    const selectedOverlay = overlays.find(o => o.id === selectedOverlayId);

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
                if (project.overlays) setOverlays(project.overlays);
            }
        }
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Shift') setIsShiftPressed(true);
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (selectedOverlayId && document.activeElement?.tagName !== 'INPUT') {
                    setOverlays(prev => prev.filter(o => o.id !== selectedOverlayId));
                    setSelectedOverlayId(null);
                }
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Shift') setIsShiftPressed(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [projectId, selectedOverlayId]);

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
                            rotation: 0,
                        };
                        setOverlays(prev => [...prev, newOverlay]);
                        setSelectedOverlayId(newOverlay.id);
                        toast.success('Sticker pegado');
                    };
                    reader.readAsDataURL(blob);
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [activeTab]);

    const updateOverlay = (id: string, updates: Partial<Overlay>) => {
        setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => setImage(event.target?.result as string);
        reader.readAsDataURL(file);
        try {
            const extractedColors = await extractColorsFromImage(file, 4); // Force exactly 4 colors
            setColors(extractedColors.map(c => c.hex));
            setPalettePosition({ x: 85, y: 50 });
            toast.success('ADN Visual extraído (4 colores)');
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

    const handleDeleteFont = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteFontFromDB(id);
            const fonts = await getAllFontsFromDB();
            setStoredFonts(fonts);
            if (selectedFontId === id) {
                setSelectedFontId(fonts.length > 0 ? fonts[0].id : null);
            }
            toast.success('Tipografía eliminada');
        } catch (error) {
            toast.error('Error al eliminar fuente');
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

    const handleDragStart = (id: string | 'palette', mode: 'move' | 'resize' | 'rotate' = 'move', e?: React.MouseEvent | React.TouchEvent) => {
        if (id === 'palette') {
            setIsDraggingPalette(true);
        } else {
            setSelectedOverlayId(id);
            if (mode === 'move') {
                setDraggingOverlayId(id);
            } else {
                const clientX = e && ('touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX);
                const clientY = e && ('touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY);
                const overlay = overlays.find(o => o.id === id);
                if (overlay && clientX !== undefined && clientY !== undefined) {
                    setInitialTransform({
                        scale: overlay.scale,
                        rotation: overlay.rotation,
                        mouseX: clientX,
                        mouseY: clientY
                    });
                    if (mode === 'resize') setIsResizing(true);
                    if (mode === 'rotate') setIsRotating(true);
                }
            }
        }
    };

    const handleGlobalDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        if (!isDraggingPalette && !draggingOverlayId && !isResizing && !isRotating) return;
        if (!canvasRef.current) return;
        
        const rect = canvasRef.current.getBoundingClientRect();
        const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
        
        if (isDraggingPalette || draggingOverlayId) {
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
        } else if ((isResizing || isRotating) && initialTransform && selectedOverlayId) {
            if (isResizing) {
                const overlay = overlays.find(o => o.id === selectedOverlayId);
                if (overlay) {
                    const centerX = rect.left + (overlay.position.x / 100) * rect.width;
                    const centerY = rect.top + (overlay.position.y / 100) * rect.height;
                    const initialDist = Math.sqrt(Math.pow(initialTransform.mouseX - centerX, 2) + Math.pow(initialTransform.mouseY - centerY, 2));
                    const currentDist = Math.sqrt(Math.pow(clientX - centerX, 2) + Math.pow(clientY - centerY, 2));
                    const newScale = (currentDist / initialDist) * initialTransform.scale;
                    setOverlays(prev => prev.map(o => o.id === selectedOverlayId ? { ...o, scale: Math.max(0.1, newScale) } : o));
                }
            } else if (isRotating) {
                const overlay = overlays.find(o => o.id === selectedOverlayId);
                if (overlay) {
                    const centerX = rect.left + (overlay.position.x / 100) * rect.width;
                    const centerY = rect.top + (overlay.position.y / 100) * rect.height;
                    const angle = Math.atan2(clientY - centerY, clientX - centerX) * (180 / Math.PI) + 90;
                    setOverlays(prev => prev.map(o => o.id === selectedOverlayId ? { ...o, rotation: angle } : o));
                }
            }
        }
    }, [isDraggingPalette, draggingOverlayId, isResizing, isRotating, initialTransform, selectedOverlayId, overlays]);

    const handleDragEnd = () => {
        setIsDraggingPalette(false);
        setDraggingOverlayId(null);
        setIsResizing(false);
        setIsRotating(false);
        setInitialTransform(null);
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
            overlays,
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
            const circleRadius = canvas.width * 0.055;
            const gap = circleRadius * 0.5;
            const startX = (palettePosition.x / 100) * canvas.width;
            const startY = (palettePosition.y / 100) * canvas.height;
            colors.forEach((color, idx) => {
                const x = startX;
                const y = startY + (idx * (circleRadius * 2 + gap));
                ctx.beginPath();
                ctx.arc(x, y, circleRadius, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 4;
                ctx.stroke();
            });
        }
        for (const o of overlays) {
            const sImg = new Image();
            sImg.src = o.dataUrl;
            await new Promise((resolve) => { sImg.onload = resolve; });
            const sw = sImg.width * o.scale * (canvas.width / 440);
            const sh = sImg.height * o.scale * (canvas.width / 440);
            ctx.save();
            ctx.translate((o.position.x / 100) * canvas.width, (o.position.y / 100) * canvas.height);
            ctx.rotate((o.rotation * Math.PI) / 180);
            ctx.drawImage(sImg, -sw/2, -sh/2, sw, sh);
            ctx.restore();
        }
        const link = document.createElement('a');
        link.download = `${projectName}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
        toast.success('Alta Resolución exportada');
    };

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-[var(--cream)] text-black select-none font-pixel overflow-hidden flex flex-col" 
                 onMouseMove={handleGlobalDrag} 
                 onTouchMove={handleGlobalDrag}
                 onMouseUp={handleDragEnd}
                 onTouchEnd={handleDragEnd}>
                
                {/* Navbar Habbo Style */}
                <header className="h-16 border-b-[3px] border-black bg-[var(--periwinkle)] flex items-center px-4 shadow-[0_4px_0_rgba(0,0,0,0.1)] z-40">
                    <div className="flex items-center gap-4 flex-1">
                        <button className="pixel-box w-10 h-10 flex items-center justify-center bg-white hover:bg-slate-50" onClick={() => navigate('/home')}>
                            <ArrowLeft size={20} strokeWidth={3} />
                        </button>
                        
                        <div className="hidden sm:flex w-10 h-10 border-[3px] border-black items-center justify-center bg-white">
                            <DaisyLogo className="w-7 h-7 text-[#d1cfea]" />
                        </div>

                        <input
                            value={projectName}
                            onChange={(e) => setProjectName(e.target.value)}
                            className="bg-[var(--cream)] border-[3px] border-black px-3 h-10 font-pixel text-xs uppercase tracking-widest focus:outline-none w-32 sm:w-64"
                        />
                    </div>

                    <div className="hidden md:flex gap-2 mx-4 bg-black/5 p-1 border-[3px] border-black">
                        <button onClick={() => setActiveTab('color-studio')} className={`h-9 px-6 font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'color-studio' ? 'bg-white border-b-[3px] border-black translate-y-[-2px]' : 'text-black/40 hover:text-black'}`}>Studio</button>
                        <button onClick={() => setActiveTab('font-studio')} className={`h-9 px-6 font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'font-studio' ? 'bg-white border-b-[3px] border-black translate-y-[-2px]' : 'text-black/40 hover:text-black'}`}>Fonts</button>
                    </div>

                    <div className="flex items-center gap-2 flex-1 justify-end">
                        <button className="pixel-box-cream h-10 px-4 font-bold text-[10px] uppercase" onClick={handleSave}>Save</button>
                        <button className="pixel-box h-10 px-4 font-bold text-[10px] uppercase flex items-center gap-2" onClick={handleExport}>
                            <span className="hidden sm:inline">Export</span> <Download size={14} strokeWidth={3} />
                        </button>
                    </div>
                </header>

                <main className="flex-1 relative flex overflow-hidden">
                    {/* Toolbar Lateral Habbo */}
                    <aside className="hidden md:flex w-20 border-r-[3px] border-black bg-[var(--cream)] flex flex-col items-center py-8 gap-8 z-30 shadow-[4px_0_0_rgba(0,0,0,0.05)]">
                        <Tooltip><TooltipTrigger asChild><button className="pixel-box w-12 h-12 flex items-center justify-center bg-white hover:scale-105 transition-transform" onClick={() => fileInputRef.current?.click()}><ImageIcon size={24} strokeWidth={3}/></button></TooltipTrigger><TooltipContent side="right">Upload Image</TooltipContent></Tooltip>
                        <div className="w-10 h-[2px] bg-black/20" />
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="w-full flex justify-center">
                                    <button className="flex items-center justify-center hover:scale-110 transition-transform p-0 border-none bg-transparent cursor-pointer outline-none">
                                        <img src="/src/assets/layers-custom.png" alt="Guide" className="w-16 h-16 object-contain drop-shadow-lg" />
                                    </button>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="max-w-[280px] p-6 bg-white border-[3px] border-black shadow-[12px_12px_0_rgba(0,0,0,1)] rounded-none z-50">
                                <div className="space-y-4 text-[14px] font-bold uppercase leading-snug font-pixel-text">
                                    <p className="text-[var(--periwinkle-dark)] border-b-2 border-black pb-2 mb-3 tracking-[0.2em] text-[12px] font-['Silkscreen']">Margarit.app Guide</p>
                                    <p className="flex gap-3"><span>•</span> <span>Carga una imagen para extraer su paleta de colores (ADN Visual).</span></p>
                                    <p className="flex gap-3"><span>•</span> <span>Para crear y editar stickers de texto, ve a la pestaña de Font Lab.</span></p>
                                    <p className="flex gap-3"><span>•</span> <span>Pega tus stickers o imágenes directamente con Ctrl+V.</span></p>
                                    <p className="flex gap-3"><span>•</span> <span>Haz clic en un sticker para rotarlo o cambiar su tamaño.</span></p>
                                </div>
                            </TooltipContent>
                        </Tooltip>
                    </aside>

                    {activeTab === 'color-studio' && (
                        <div className="flex-1 flex flex-col md:flex-row relative">
                            <div className="flex-1 flex flex-col items-center justify-center relative bg-[var(--cream)]/30 py-4 sm:py-8 overflow-auto">
                                <div className="mb-6 flex gap-2 z-30">
                                    {(['9:16', '1:1', '4:5'] as Format[]).map((f) => (
                                        <button key={f} onClick={() => setFormat(f)} className={`pixel-box px-6 py-2 font-bold text-[10px] uppercase tracking-widest transition-all ${format === f ? 'bg-black text-white' : 'bg-white'}`}>{f}</button>
                                    ))}
                                </div>

                                <div className="relative">
                                    <div 
                                        ref={canvasRef} 
                                        onClick={() => setSelectedOverlayId(null)}
                                        className={`relative bg-white border-[4px] border-black shadow-[16px_16px_0_rgba(0,0,0,1)] overflow-hidden ${format === '9:16' ? 'aspect-[9/16]' : format === '1:1' ? 'aspect-square' : 'aspect-[4/5]'} w-[300px] sm:w-[440px] transition-all`}
                                    >
                                        {image ? <img src={image} className="absolute inset-0 w-full h-full object-cover" /> : (
                                            <div className="absolute inset-0 flex flex-col items-center justify-center m-8 border-4 border-dashed border-black/10 cursor-pointer bg-black/5 hover:bg-black/10" onClick={() => fileInputRef.current?.click()}>
                                                <Upload size={40} className="mb-4 opacity-20" /><span className="text-[10px] uppercase font-bold tracking-widest">Subir Imagen</span>
                                            </div>
                                        )}
                                        
                                        {colors.length > 0 && (
                                            <div 
                                                className="absolute z-40 grid grid-cols-1 gap-4 cursor-move p-4"
                                                style={{ top: `${palettePosition.y}%`, left: `${palettePosition.x}%`, transform: 'translate(-50%, -50%)' }}
                                                onMouseDown={(e) => { e.stopPropagation(); handleDragStart('palette'); }}
                                                onTouchStart={(e) => { e.stopPropagation(); handleDragStart('palette'); }}
                                            >
                                                {colors.slice(0, 4).map((color, idx) => (
                                                    <div key={idx} className="w-12 h-12 sm:w-16 sm:h-16 border-[3px] border-black rounded-full shadow-[4px_4px_0_rgba(0,0,0,0.3)] hover:scale-110 transition-all cursor-pointer" style={{ backgroundColor: color }} onClick={(e) => { e.stopPropagation(); setSelectedColor(color); }} />
                                                ))}
                                            </div>
                                        )}

                                        {overlays.map((o) => (
                                            <div 
                                                key={o.id} 
                                                className={`absolute cursor-move z-30`} 
                                                style={{ left: `${o.position.x}%`, top: `${o.position.y}%`, transform: `translate(-50%, -50%) rotate(${o.rotation}deg)` }} 
                                                onMouseDown={(e) => { e.stopPropagation(); handleDragStart(o.id, 'move', e); }} 
                                                onTouchStart={(e) => { e.stopPropagation(); handleDragStart(o.id, 'move', e); }}
                                            >
                                                <div className="relative group">
                                                    <img 
                                                        src={o.dataUrl} 
                                                        className={`max-w-[200px] sm:max-w-[300px] pointer-events-none drop-shadow-[4px_4px_0_rgba(0,0,0,0.2)] transition-all ${selectedOverlayId === o.id ? 'ring-[3px] ring-white outline-[3px] outline-black ring-offset-0' : ''}`} 
                                                        style={{ transform: `scale(${o.scale})` }} 
                                                    />
                                                    {selectedOverlayId === o.id && (
                                                        <>
                                                            {['tl', 'tr', 'bl', 'br'].map((pos) => (
                                                                <div key={pos} className={`absolute w-6 h-6 bg-white border-[3px] border-black z-50 cursor-nwse-resize transform -translate-x-1/2 -translate-y-1/2 shadow-lg`} style={{ top: pos.startsWith('t') ? '0%' : '100%', left: pos.endsWith('l') ? '0%' : '100%' }} onMouseDown={(e) => { e.stopPropagation(); handleDragStart(o.id, 'resize', e); }} onTouchStart={(e) => { e.stopPropagation(); handleDragStart(o.id, 'resize', e); }} />
                                                            ))}
                                                            <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-10 h-10 bg-white border-[3px] border-black rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing z-50 shadow-lg" onMouseDown={(e) => { e.stopPropagation(); handleDragStart(o.id, 'rotate', e); }} onTouchStart={(e) => { e.stopPropagation(); handleDragStart(o.id, 'rotate', e); }}><RotateCw size={18} strokeWidth={3} /></div>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <aside className="hidden md:flex w-80 border-l-[3px] border-black bg-[var(--cream)] flex flex-col p-8 gap-8 z-30 overflow-y-auto">
                                {selectedOverlay && (
                                    <div className="pixel-box-cream p-6 bg-white border-b-4 border-black">
                                        <h3 className="text-[10px] uppercase font-bold mb-6 flex items-center gap-2"><Settings2 size={16}/> Transform</h3>
                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center"><label className="text-[9px] uppercase font-black opacity-40 text-black">Scale</label><span className="text-[10px] font-bold">{(selectedOverlay.scale * 100).toFixed(0)}%</span></div>
                                                <Slider value={[selectedOverlay.scale * 100]} min={10} max={300} onValueChange={([v]) => updateOverlay(selectedOverlayId!, { scale: v / 100 })} />
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center"><label className="text-[9px] uppercase font-black opacity-40 text-black">Rotation</label><span className="text-[10px] font-bold">{selectedOverlay.rotation.toFixed(0)}°</span></div>
                                                <Slider value={[selectedOverlay.rotation]} min={0} max={360} onValueChange={([v]) => updateOverlay(selectedOverlayId!, { rotation: v })} />
                                            </div>
                                            <button onClick={() => { setOverlays(prev => prev.filter(o => o.id !== selectedOverlayId)); setSelectedOverlayId(null); }} className="w-full h-12 bg-black text-white uppercase text-[10px] font-bold flex items-center justify-center gap-3 hover:bg-red-600 transition-colors"><Trash2 size={14}/> Remove Sticker</button>
                                        </div>
                                    </div>
                                )}
                                <div className="pixel-box-cream p-4 bg-white">
                                    <h3 className="text-[10px] uppercase font-bold border-b-2 border-black pb-2 mb-4 flex items-center gap-2"><Palette size={16}/> Palette</h3>
                                    <div className="space-y-3">
                                        {colors.map((color, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-2 border-2 border-black hover:bg-[var(--periwinkle)]/20 cursor-pointer" onClick={() => setSelectedColor(color)}><div className="w-8 h-8 border-2 border-black shadow-[2px_2px_0_rgba(0,0,0,1)]" style={{ backgroundColor: color }} /><div className="flex flex-col"><span className="text-[10px] font-bold text-black/40 uppercase leading-none mb-1">HEX</span><span className="font-pixel-text text-sm font-bold">{color}</span></div></div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pixel-box-cream p-4 flex-1 bg-white">
                                    <h3 className="text-[10px] uppercase font-bold border-b-2 border-black pb-2 mb-4 flex items-center gap-2"><img src="/src/assets/layers-custom.png" alt="Layers" className="w-4 h-4 object-contain" /> Inventory</h3>
                                    <div className="grid grid-cols-2 gap-4">
                                        {overlays.map(o => (
                                            <div key={o.id} onClick={() => setSelectedOverlayId(o.id)} className={`aspect-square bg-[var(--cream)] border-2 border-black p-2 relative group hover:bg-white transition-all cursor-pointer ${selectedOverlayId === o.id ? 'bg-white ring-2 ring-black' : ''}`}><img src={o.dataUrl} className="w-full h-full object-contain" /><button className="absolute top-[-8px] right-[-8px] w-6 h-6 bg-black text-white border-2 border-black flex items-center justify-center opacity-0 group-hover:opacity-100" onClick={(e) => { e.stopPropagation(); setOverlays(prev => prev.filter(ov => ov.id !== o.id)); if (selectedOverlayId === o.id) setSelectedOverlayId(null); }}><Trash2 size={10}/></button></div>
                                        ))}
                                    </div>
                                </div>
                            </aside>
                        </div>
                    )}

                    {activeTab === 'font-studio' && (
                        <div className="flex-1 flex flex-col md:flex-row z-20 relative overflow-hidden">
                            <div className="hidden md:flex w-80 border-r-[3px] border-black bg-[var(--cream)] p-8 flex flex-col gap-6">
                                <h3 className="text-[10px] uppercase font-bold bg-black text-white p-2 text-center tracking-[0.2em]">Caja de Fuentes</h3>
                                <button onClick={() => fontInputRef.current?.click()} className="pixel-box-cream h-12 flex items-center justify-center gap-3 uppercase text-[10px] font-bold bg-white hover:bg-[var(--periwinkle)]/20 transition-all"><Plus size={16} strokeWidth={3}/> Load .TTF</button>
                                <div className="flex flex-col gap-4 overflow-y-auto pb-4 pr-2 no-scrollbar">
                                    {storedFonts.map((f) => (
                                        <div key={f.id} onClick={() => setSelectedFontId(f.id)} className={`p-4 border-2 border-black cursor-pointer shrink-0 w-full transition-all relative group ${selectedFontId === f.id ? 'bg-[var(--periwinkle)] shadow-none translate-x-1' : 'bg-white shadow-[4px_4px_0_rgba(0,0,0,1)]'}`}><button onClick={(e) => handleDeleteFont(f.id, e)} className="absolute top-2 right-2 p-1 bg-black text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"><Trash2 size={10} /></button><p className="text-[9px] font-bold uppercase truncate opacity-60 pr-6">{f.name}</p><p style={{ fontFamily: f.id }} className="text-2xl truncate pt-2">Aa 123</p></div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-1 p-4 sm:p-12 flex flex-col items-center justify-center bg-black/5 overflow-y-auto">
                                <div className="bg-white w-full max-w-2xl p-6 sm:p-10 border-[3px] border-black shadow-[8px_8px_0_rgba(0,0,0,1)] sm:shadow-[16px_16px_0_rgba(0,0,0,1)] flex flex-col gap-6 sm:gap-10">
                                    <div className="bg-checkered h-48 sm:h-64 border-[3px] border-black flex items-center justify-center p-6 sm:p-10 relative overflow-hidden shadow-[inset_4px_4px_0_rgba(0,0,0,0.1)]"><p style={{ fontFamily: selectedFontId || 'sans-serif', color: stickerColor, fontSize: 'clamp(2rem, 10vw, 5rem)', textAlign: 'center', filter: 'drop-shadow(4px 4px 0 rgba(0,0,0,0.2))' }}>{stickerText}</p></div>
                                    <div className="hidden md:flex flex-col gap-6"><div className="flex flex-col gap-2"><label className="text-[10px] uppercase font-bold text-black/40">Content</label><input value={stickerText} onChange={(e) => setStickerText(e.target.value)} className="pixel-box-cream h-14 px-6 border-[3px] border-black text-lg font-bold focus:outline-none focus:bg-[var(--periwinkle)]/10" /></div><div className="flex gap-4"><button onClick={() => setStickerColor('white')} className={`flex-1 pixel-box-cream h-12 uppercase text-[10px] font-bold ${stickerColor === 'white' ? 'bg-black text-white shadow-none translate-y-1' : ''}`}>White</button><button onClick={() => setStickerColor('black')} className={`flex-1 pixel-box-cream h-12 uppercase text-[10px] font-bold ${stickerColor === 'black' ? 'bg-black text-white shadow-none translate-y-1' : ''}`}>Black</button></div><button onClick={handleCopySticker} className="pixel-box h-16 bg-[var(--periwinkle)] text-black uppercase text-[12px] font-bold flex items-center justify-center gap-4 hover:bg-[var(--periwinkle-dark)] transition-all shadow-[8px_8px_0_rgba(0,0,0,1)] active:shadow-none active:translate-y-1"><ClipboardPaste size={20} strokeWidth={3}/> Copy to Studio</button></div>
                                    <div className="md:hidden"><button onClick={handleCopySticker} className="w-full pixel-box h-14 bg-[var(--periwinkle)] text-black uppercase text-[10px] font-bold flex items-center justify-center gap-3"><ClipboardPaste size={18} strokeWidth={3}/> Copy to Studio</button></div>
                                </div>
                            </div>
                        </div>
                    )}
                </main>

                <footer className="md:hidden h-20 border-t-[3px] border-black bg-white sticky bottom-0 z-50 flex items-center px-6 overflow-x-auto gap-6 no-scrollbar shadow-[0_-4px_0_rgba(0,0,0,0.05)]">
                    <button onClick={() => setActiveTab('color-studio')} className={`flex flex-col items-center gap-1 shrink-0 ${activeTab === 'color-studio' ? 'text-black' : 'text-black/30'}`}><Palette size={20}/><span className="text-[8px] font-bold uppercase tracking-tighter">Studio</span></button>
                    <button onClick={() => setActiveTab('font-studio')} className={`flex flex-col items-center gap-1 shrink-0 ${activeTab === 'font-studio' ? 'text-black' : 'text-black/30'}`}><Type size={20}/><span className="text-[8px] font-bold uppercase tracking-tighter">Fonts</span></button>
                    <div className="w-[3px] h-10 bg-black opacity-10 shrink-0" />
                    <Drawer>
                        <DrawerTrigger asChild><button className="flex flex-col items-center gap-1 shrink-0 text-black/40">{activeTab === 'color-studio' ? <img src="/src/assets/layers-custom.png" alt="Layers" className="w-8 h-8 object-contain" /> : <Type size={24}/>}<span className="text-[8px] font-bold uppercase tracking-tighter">{activeTab === 'color-studio' ? 'Layers' : 'Font Settings'}</span></button></DrawerTrigger>
                        <DrawerContent className="bg-[var(--cream)] border-t-[3px] border-black rounded-none h-[80vh] focus:outline-none">
                            <DrawerHeader className="border-b-2 border-black"><DrawerTitle className="text-[10px] uppercase font-bold text-center">{activeTab === 'color-studio' ? 'Gestión de Capas' : 'Personalizar Texto'}</DrawerTitle></DrawerHeader>
                            <div className="p-6 overflow-y-auto space-y-8 no-scrollbar pb-12">
                                {activeTab === 'color-studio' ? (
                                    <>
                                        {selectedOverlay && (
                                            <div className="pixel-box-cream p-6 bg-white space-y-6">
                                                <h3 className="text-[10px] uppercase font-bold mb-4 flex items-center gap-2 border-b-2 border-black pb-2"><Maximize size={16}/> Resize & Rotate</h3>
                                                <div className="space-y-6">
                                                    <div className="space-y-3"><div className="flex justify-between text-[9px] font-bold uppercase"><span>Scale</span><span>{(selectedOverlay.scale * 100).toFixed(0)}%</span></div><Slider value={[selectedOverlay.scale * 100]} min={10} max={300} onValueChange={([v]) => updateOverlay(selectedOverlayId!, { scale: v / 100 })} /></div>
                                                    <div className="space-y-3"><div className="flex justify-between text-[9px] font-bold uppercase"><span>Rotation</span><span>{selectedOverlay.rotation.toFixed(0)}°</span></div><Slider value={[selectedOverlay.rotation]} min={0} max={360} onValueChange={([v]) => updateOverlay(selectedOverlayId!, { rotation: v })} /></div>
                                                    <button onClick={() => { setOverlays(prev => prev.filter(o => o.id !== selectedOverlayId)); setSelectedOverlayId(null); }} className="w-full h-10 bg-red-500 border-2 border-black text-white uppercase text-[10px] font-bold flex items-center justify-center gap-2">Delete Sticker</button>
                                                </div>
                                            </div>
                                        )}
                                        <div className="pixel-box-cream p-4 bg-white"><h3 className="text-[10px] uppercase font-bold border-b-2 border-black pb-2 mb-4 flex items-center gap-2"><Palette size={16}/> Palette</h3><div className="grid grid-cols-2 gap-3">{colors.map((color, idx) => (<div key={idx} className="flex items-center gap-2 p-2 border-2 border-black hover:bg-[var(--periwinkle)]/20 cursor-pointer" onClick={() => setSelectedColor(color)}><div className="w-6 h-6 border-2 border-black shadow-[1px_1px_0_rgba(0,0,0,1)]" style={{ backgroundColor: color }} /><span className="font-pixel-text text-[10px] font-bold">{color}</span></div>))}</div></div>
                                        <div className="pixel-box-cream p-4 bg-white"><h3 className="text-[10px] uppercase font-bold border-b-2 border-black pb-2 mb-4 flex items-center gap-2"><img src="/src/assets/layers-custom.png" alt="Layers" className="w-4 h-4 object-contain" /> Inventory</h3><div className="grid grid-cols-3 gap-4">{overlays.map(o => (<div key={o.id} onClick={() => { setSelectedOverlayId(o.id); }} className={`aspect-square bg-[var(--cream)] border-2 border-black p-1 relative group ${selectedOverlayId === o.id ? 'ring-2 ring-black bg-white' : ''}`}><img src={o.dataUrl} className="w-full h-full object-contain" /><button className="absolute top-[-5px] right-[-5px] w-5 h-5 bg-black text-white border-2 border-black flex items-center justify-center" onClick={(e) => { e.stopPropagation(); setOverlays(prev => prev.filter(ov => ov.id !== o.id)); if (selectedOverlayId === o.id) setSelectedOverlayId(null); }}><Trash2 size={8}/></button></div>))}</div></div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex flex-col gap-4"><label className="text-[10px] uppercase font-bold text-black/40">Contenido</label><input value={stickerText} onChange={(e) => setStickerText(e.target.value)} className="pixel-box-cream h-12 px-4 border-[2px] border-black text-sm font-bold focus:outline-none" placeholder="Escribe algo..." /></div>
                                        <div className="flex flex-col gap-4"><label className="text-[10px] uppercase font-bold text-black/40">Color</label><div className="flex gap-3"><button onClick={() => setStickerColor('white')} className={`flex-1 pixel-box-cream h-10 uppercase text-[10px] font-bold ${stickerColor === 'white' ? 'bg-black text-white' : 'bg-white'}`}>White</button><button onClick={() => setStickerColor('black')} className={`flex-1 pixel-box-cream h-10 uppercase text-[10px] font-bold ${stickerColor === 'black' ? 'bg-black text-white' : 'bg-white'}`}>Black</button></div></div>
                                        <div className="flex flex-col gap-4"><div className="flex items-center justify-between"><label className="text-[10px] uppercase font-bold text-black/40">Tipografía</label><button onClick={() => fontInputRef.current?.click()} className="text-[9px] underline uppercase font-bold">Cargar .TTF</button></div><div className="grid grid-cols-1 gap-3 pb-8">{storedFonts.map((f) => (<div key={f.id} onClick={() => setSelectedFontId(f.id)} className={`p-4 border-2 border-black cursor-pointer flex items-center justify-between transition-all ${selectedFontId === f.id ? 'bg-[var(--periwinkle)]' : 'bg-white'}`}><span className="text-[9px] font-bold uppercase truncate opacity-60 pr-4">{f.name}</span><div className="flex items-center gap-4"><span style={{ fontFamily: f.id }} className="text-lg">Aa</span><button onClick={(e) => handleDeleteFont(f.id, e)} className="w-8 h-8 flex items-center justify-center bg-black text-white active:bg-red-500"><Trash2 size={12} /></button></div></div>))}</div></div>
                                    </>
                                )}
                            </div>
                        </DrawerContent>
                    </Drawer>
                    <div className="w-[3px] h-10 bg-black opacity-10 shrink-0" />
                    <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-1 shrink-0 text-black/40"><ImageIcon size={20}/><span className="text-[8px] font-bold uppercase tracking-tighter">Upload</span></button>
                    <div className="flex gap-3 shrink-0 pr-6">{colors.slice(0, 3).map((c, i) => <div key={i} onClick={() => setSelectedColor(c)} className="w-10 h-10 rounded-full border-[3px] border-black shadow-sm" style={{ backgroundColor: c }} />)}</div>
                </footer>

                <Dialog open={!!selectedColor} onOpenChange={(open) => !open && setSelectedColor(null)}><DialogContent className="max-w-xs p-10 border-[4px] border-black rounded-none bg-white shadow-[12px_12px_0_rgba(0,0,0,0.2)] sm:rounded-none"><DialogHeader className="mb-8 text-center uppercase tracking-widest text-[10px] font-bold border-b-2 border-black pb-4">Inspect Color</DialogHeader><div className="space-y-8 flex flex-col items-center"><div className="w-32 h-32 border-[4px] border-black shadow-[8px_8px_0_rgba(0,0,0,0.1)]" style={{ backgroundColor: selectedColor || '' }} /><div className="flex gap-2 w-full"><input value={selectedColor || ''} readOnly className="pixel-box-cream h-14 font-pixel-text text-center flex-1 focus:outline-none" /><button onClick={() => { navigator.clipboard.writeText(selectedColor || ''); setCopiedColor(selectedColor); toast.success('HEX Copied'); setTimeout(() => setCopiedColor(null), 2000); }} className="pixel-box w-14 h-14 bg-[var(--periwinkle)] flex items-center justify-center border-[3px] border-black">{copiedColor === selectedColor ? <Check size={20} strokeWidth={3}/> : <Copy size={20} strokeWidth={3}/>}</button></div></div></DialogContent></Dialog>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <input ref={fontInputRef} type="file" accept=".ttf,.otf" className="hidden" onChange={handleFontUpload} />
            </div>
        </TooltipProvider>
    );
}
