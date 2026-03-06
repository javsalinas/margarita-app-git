import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Upload, Copy, Check, Download, Type, Layers, Plus, Image as ImageIcon, Trash2, ClipboardPaste, Palette, Monitor } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractColorsFromImage } from '../utils/colorExtractor';
import { saveProject, getProject, getUser } from '../utils/storage';
import { generateTextSticker } from '../utils/fontLoader';
import { saveFontToDB, getAllFontsFromDB, deleteFontFromDB, registerFont } from '../utils/fontDatabase';
import { toast } from 'sonner';

// UI Components
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

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
    const [palettePosition, setPalettePosition] = useState({ x: 80, y: 10 });
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

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => setImage(event.target?.result as string);
        reader.readAsDataURL(file);

        try {
            const extractedColors = await extractColorsFromImage(file, 6);
            setColors(extractedColors.map(c => c.hex));
            toast.success('Colores extraídos');
        } catch (error) {
            toast.error('Error al extraer colores');
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
                toast.success('Fuente guardada');
            }
        } catch (error) {
            toast.error('Error al guardar fuente');
        }
    };

    const handleCopySticker = async () => {
        if (!selectedFontId) return toast.error('Selecciona una fuente');
        const dataUrl = generateTextSticker(stickerText, selectedFontId, stickerColor);
        try {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
            toast.success('Sticker copiado');
        } catch (error) {
            toast.error('Error al copiar');
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

        const pctX = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        const pctY = Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100));

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
        if (!image || colors.length === 0) return toast.error('Necesitas imagen y colores');
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
        toast.success('Guardado correctamente');
    };

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-[#F5F5F7] text-black select-none overflow-hidden flex flex-col" 
                 onMouseMove={handleGlobalDrag} 
                 onTouchMove={handleGlobalDrag}
                 onMouseUp={handleDragEnd}
                 onTouchEnd={handleDragEnd}>
                
                {/* Clean Top Navbar */}
                <header className="h-16 border-b-2 border-black bg-white flex items-center px-6 z-40">
                    <div className="flex items-center gap-4 flex-1">
                        <button className="w-10 h-10 flex items-center justify-center border-2 border-black rounded-lg hover:bg-black hover:text-white transition-colors" onClick={() => navigate('/home')}>
                            <ArrowLeft size={20} />
                        </button>
                        
                        <div className="h-8 w-[2px] bg-black opacity-10 mx-2" />

                        <div className="flex flex-col">
                            <span className="text-[10px] font-['Silkscreen'] uppercase tracking-widest text-slate-400">Project</span>
                            <input
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                className="bg-transparent border-none font-['Archivo'] font-bold text-lg focus:outline-none p-0 h-6 w-48"
                            />
                        </div>
                    </div>

                    {/* Tab Switcher (Minimal) */}
                    <div className="flex bg-slate-100 p-1 rounded-xl border-2 border-black gap-1">
                        <button 
                            onClick={() => setActiveTab('color-studio')}
                            className={`px-6 h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'color-studio' ? 'bg-black text-white' : 'text-slate-500 hover:text-black'}`}>
                            Studio
                        </button>
                        <button 
                            onClick={() => setActiveTab('font-studio')}
                            className={`px-6 h-9 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'font-studio' ? 'bg-black text-white' : 'text-slate-500 hover:text-black'}`}>
                            Font Lab
                        </button>
                    </div>

                    <div className="flex items-center gap-3 flex-1 justify-end">
                        <button className="px-6 h-10 rounded-xl border-2 border-black font-['Archivo'] font-bold text-xs uppercase hover:bg-slate-50 transition-all" onClick={handleSave}>Save</button>
                        <button className="px-6 h-10 rounded-xl bg-black text-white font-['Archivo'] font-bold text-xs uppercase flex items-center gap-2 hover:opacity-90 transition-all">
                            Export <Download size={14} />
                        </button>
                    </div>
                </header>

                <main className="flex-1 relative flex overflow-hidden">
                    
                    {/* LEFT TOOLS */}
                    <aside className="w-20 border-r-2 border-black bg-white flex flex-col items-center py-8 gap-8 z-30">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button className="w-12 h-12 flex items-center justify-center border-2 border-black rounded-2xl hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all" onClick={() => fileInputRef.current?.click()}>
                                    <ImageIcon size={20} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-['Archivo'] font-bold">Base Image</TooltipContent>
                        </Tooltip>
                        
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button className="w-12 h-12 flex items-center justify-center border-2 border-black rounded-2xl hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all">
                                    <Layers size={20} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-['Archivo'] font-bold">Layers</TooltipContent>
                        </Tooltip>

                        <div className="w-10 h-[2px] bg-black opacity-10" />

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <button className="w-12 h-12 flex items-center justify-center border-2 border-black rounded-2xl hover:bg-slate-50 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-[1px] active:shadow-none transition-all">
                                    <Monitor size={20} />
                                </button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-['Archivo'] font-bold">Format</TooltipContent>
                        </Tooltip>
                    </aside>

                    {/* CENTRAL CANVAS AREA */}
                    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-[#FAFAFA] relative overflow-auto">
                        
                        {/* Format Bar (Moved here) */}
                        <div className="mb-8 flex bg-white p-1.5 rounded-2xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-30">
                            {(['9:16', '1:1', '4:5'] as Format[]).map((f) => (
                                <button 
                                    key={f} 
                                    onClick={() => setFormat(f)} 
                                    className={`px-6 py-2 rounded-xl text-[10px] font-['Archivo'] font-black uppercase tracking-widest transition-all ${format === f ? 'bg-black text-white shadow-lg' : 'text-slate-400 hover:text-black'}`}>
                                    {f === '9:16' ? 'Story' : f === '1:1' ? 'Square' : 'Feed'}
                                </button>
                            ))}
                        </div>

                        {/* Front-Facing Canvas Frame */}
                        <div className="relative group flex items-center justify-center">
                            {/* Color Staple Panel (Integrated) */}
                            {colors.length > 0 && (
                                <div 
                                    className="absolute top-[-30px] left-1/2 -translate-x-1/2 z-40 bg-white border-2 border-black px-4 py-2 flex gap-3 rounded-full shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] cursor-move hover:scale-105 transition-transform"
                                    onMouseDown={() => handleDragStart('palette')}
                                    onTouchStart={() => handleDragStart('palette')}
                                >
                                    {colors.map((color, idx) => (
                                        <div 
                                            key={idx} 
                                            className="w-5 h-5 rounded-full border-2 border-black"
                                            style={{ backgroundColor: color }}
                                            onClick={(e) => { e.stopPropagation(); setSelectedColor(color); }}
                                        />
                                    ))}
                                </div>
                            )}

                            {/* The Visual Block */}
                            <div 
                                ref={canvasRef} 
                                className={`relative bg-white border-2 border-black shadow-[16px_16px_0px_0px_rgba(0,0,0,0.05)] overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${format === '9:16' ? 'h-[75vh] aspect-[9/16]' : format === '1:1' ? 'h-[60vh] aspect-square' : 'h-[70vh] aspect-[4/5]'} min-h-[400px]`}
                            >
                                {image ? (
                                    <img src={image} className="absolute inset-0 w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center m-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => fileInputRef.current?.click()}>
                                        <Upload size={40} className="mb-4 text-slate-300" />
                                        <p className="text-[10px] font-['Archivo'] font-bold uppercase tracking-[0.2em] text-slate-400">Upload Base Image</p>
                                    </div>
                                )}
                                
                                {/* Grid Sub-layer */}
                                <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

                                {/* Overlays */}
                                {overlays.map((o) => (
                                    <div
                                        key={o.id}
                                        className={`absolute cursor-move z-30 ${draggingOverlayId === o.id ? 'outline-2 outline-dashed outline-black' : ''}`}
                                        style={{ left: `${o.position.x}%`, top: `${o.position.y}%`, transform: 'translate(-50%, -50%)' }}
                                        onMouseDown={() => handleDragStart(o.id)}
                                        onTouchStart={() => handleDragStart(o.id)}
                                    >
                                        <img src={o.dataUrl} className="max-w-[250px] pointer-events-none" style={{ transform: `scale(${o.scale})` }} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SIDEBAR (Offset Shadows System) */}
                    <aside className="w-80 border-l-2 border-black bg-white flex flex-col p-8 gap-8 z-30 overflow-auto">
                        
                        {/* Section: Palette */}
                        <div>
                            <h3 className="text-[10px] font-['Silkscreen'] uppercase tracking-[0.2em] mb-6 text-black">Color Studio</h3>
                            <div className="space-y-3">
                                {colors.map((color, idx) => (
                                    <div 
                                        key={idx} 
                                        className="group relative flex items-center gap-4 p-3 bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all cursor-pointer"
                                        onClick={() => { navigator.clipboard.writeText(color); toast.success(`Copied ${color}`); }}
                                    >
                                        <div className="w-10 h-10 rounded-lg border-2 border-black shrink-0 shadow-sm" style={{ backgroundColor: color }} />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-['Archivo'] font-black uppercase text-slate-400 leading-none mb-1">Hex Code</span>
                                            <span className="font-['Archivo'] font-bold text-sm tracking-tight">{color}</span>
                                        </div>
                                        <Copy size={12} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                ))}
                                {colors.length === 0 && (
                                    <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center gap-2">
                                        <Palette size={20} className="text-slate-200" />
                                        <p className="text-[9px] font-['Archivo'] font-bold text-slate-300 uppercase tracking-widest text-center leading-relaxed">Extract palette from image</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section: Stickers Inventory */}
                        <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-[10px] font-['Silkscreen'] uppercase tracking-[0.2em] text-black">Inventory</h3>
                                <button className="w-6 h-6 border-2 border-black rounded-md flex items-center justify-center hover:bg-slate-50" onClick={() => setActiveTab('font-studio')}>
                                    <Plus size={14} />
                                </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                {overlays.map(o => (
                                    <div key={o.id} className="aspect-square bg-white border-2 border-black rounded-2xl p-3 relative group hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                                        <img src={o.dataUrl} className="w-full h-full object-contain" />
                                        <button 
                                            className="absolute top-[-8px] right-[-8px] w-6 h-6 bg-black text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border-2 border-black"
                                            onClick={() => setOverlays(prev => prev.filter(ov => ov.id !== o.id))}
                                        >
                                            <Trash2 size={10}/>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Export Hint Card */}
                        <div className="bg-black p-6 rounded-[24px] text-white">
                            <p className="text-[10px] font-['Archivo'] font-bold uppercase tracking-widest leading-relaxed opacity-60 mb-2">Editor Tip</p>
                            <p className="text-xs font-['Archivo'] leading-relaxed">Drag the palette staple over your image to analyze contrast in real-time.</p>
                        </div>
                    </aside>
                </main>

                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </div>
        </TooltipProvider>
    );
}
