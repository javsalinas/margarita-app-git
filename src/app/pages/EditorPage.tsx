import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Upload, Copy, Check, X, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { extractColorsFromImage } from '../utils/colorExtractor';
import { saveProject, getProject, getUser } from '../utils/storage';
import { toast } from 'sonner';

type Format = '9:16' | '1:1' | '4:5';

export default function EditorPage() {
  const navigate = useNavigate();
  const { projectId } = useParams();

  const [projectName, setProjectName] = useState('Nuevo Proyecto');
  const [format, setFormat] = useState<Format>('9:16');
  const [image, setImage] = useState<string | null>(null);
  const [colors, setColors] = useState<string[]>([]);
  const [palettePosition, setPalettePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  // Cargar proyecto existente
  useEffect(() => {
    const user = getUser();
    if (!user) {
      navigate('/');
      return;
    }

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
      // Posición inicial de la paleta (esquina superior derecha)
      setPalettePosition({ x: 80, y: 10 });
    }
  }, [projectId, navigate]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Mostrar imagen
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Extraer colores
    try {
      const extractedColors = await extractColorsFromImage(file, 6);
      setColors(extractedColors.map(c => c.hex));
      toast.success('Colores extraídos exitosamente');
    } catch (error) {
      toast.error('Error al extraer colores');
      console.error(error);
    }
  };

  const handleLongPressStart = () => {
    longPressTimer.current = setTimeout(() => {
      setIsDragging(true);
    }, 500); // 500ms para activar el long press
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
    navigate('/home');
  };

  const getCanvasAspectRatio = () => {
    switch (format) {
      case '9:16':
        return 'aspect-[9/16]';
      case '1:1':
        return 'aspect-square';
      case '4:5':
        return 'aspect-[4/5]';
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF3DD]">
      {/* Header */}
      <header className="bg-[#B7E4C7] border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/home')}
              className="border-2 border-black bg-white hover:bg-[#FAF3DD]"
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="max-w-xs border-2 border-black bg-white font-bold"
              style={{ boxShadow: '2px 2px 0px #000000' }}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleSave}
              className="border-2 border-black bg-white hover:bg-[#FAF3DD] font-bold"
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              Guardar
            </Button>
            <Button 
              className="bg-[#F4C152] hover:bg-[#F4C152]/90 text-black border-2 border-black font-black"
              style={{ boxShadow: '2px 2px 0px #000000' }}
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
      </header>

      {/* Main Editor */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
          {/* Canvas Area */}
          <div className="space-y-4">
            {/* Format Selector */}
            <div className="bg-white border-2 border-black rounded-[4px] p-4 flex items-center gap-3" style={{ boxShadow: '4px 4px 0px #000000' }}>
              <span className="text-sm font-black text-black">Formato:</span>
              <div className="flex gap-2">
                {(['9:16', '1:1', '4:5'] as Format[]).map((f) => (
                  <Button
                    key={f}
                    variant={format === f ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFormat(f)}
                    className={format === f 
                      ? 'bg-[#F4C152] text-black border-2 border-black font-black' 
                      : 'border-2 border-black bg-white hover:bg-[#FAF3DD] font-bold'
                    }
                    style={{ boxShadow: '2px 2px 0px #000000' }}
                  >
                    {f === '9:16' ? 'Story' : f === '1:1' ? 'Cuadrado' : 'Feed'}
                  </Button>
                ))}
              </div>
            </div>

            {/* Canvas */}
            <div className="bg-white border-2 border-black rounded-[4px] p-8" style={{ boxShadow: '6px 6px 0px #000000' }}>
              <div className="flex justify-center">
                <div
                  ref={canvasRef}
                  className={`relative ${getCanvasAspectRatio()} w-full max-w-md bg-[#FAF3DD] border-2 border-black rounded-[4px] overflow-hidden`}
                  style={{ boxShadow: '4px 4px 0px #000000' }}
                  onMouseMove={handlePaletteDrag}
                  onTouchMove={handlePaletteDrag}
                  onMouseUp={handleLongPressEnd}
                  onTouchEnd={handleLongPressEnd}
                >
                  {/* Background Image */}
                  {image ? (
                    <img
                      src={image}
                      alt="Canvas"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-black">
                      <Upload className="w-16 h-16 mb-4" />
                      <p className="text-sm font-bold">Carga una imagen para empezar</p>
                    </div>
                  )}

                  {/* Color Palette Staple */}
                  {colors.length > 0 && (
                    <motion.div
                      className="absolute flex flex-col gap-2 cursor-pointer"
                      style={{
                        left: `${palettePosition.x}%`,
                        top: `${palettePosition.y}%`,
                      }}
                      animate={{
                        scale: isDragging ? 1.1 : 1,
                      }}
                      onMouseDown={handleLongPressStart}
                      onTouchStart={handleLongPressStart}
                    >
                      {colors.map((color, idx) => (
                        <motion.div
                          key={idx}
                          className="w-12 h-12 rounded-full border-2 border-black"
                          style={{ backgroundColor: color, boxShadow: '2px 2px 0px #000000' }}
                          whileHover={{ scale: 1.15 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleColorClick(color)}
                        />
                      ))}
                      
                      {isDragging && (
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded-[2px] whitespace-nowrap font-bold">
                          Arrastrando...
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Upload Image */}
            <div className="bg-white border-2 border-black rounded-[4px] p-6" style={{ boxShadow: '4px 4px 0px #000000' }}>
              <h3 className="font-black mb-4 text-black">Cargar Imagen</h3>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full border-2 border-black bg-white hover:bg-[#FAF3DD] font-bold"
                style={{ boxShadow: '2px 2px 0px #000000' }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Seleccionar Imagen
              </Button>
              <p className="text-xs text-black/70 mt-3 font-medium">
                Sube una imagen de alta resolución para extraer su paleta de colores
              </p>
            </div>

            {/* Color List */}
            {colors.length > 0 && (
              <div className="bg-white border-2 border-black rounded-[4px] p-6" style={{ boxShadow: '4px 4px 0px #000000' }}>
                <h3 className="font-black mb-4 text-black">Paleta Extraída</h3>
                <div className="space-y-2">
                  {colors.map((color, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-2 rounded-[2px] hover:bg-[#FAF3DD] cursor-pointer border border-black"
                      style={{ boxShadow: '1px 1px 0px #000000' }}
                      onClick={() => handleColorClick(color)}
                    >
                      <div
                        className="w-10 h-10 rounded-full border-2 border-black"
                        style={{ backgroundColor: color, boxShadow: '2px 2px 0px #000000' }}
                      />
                      <span className="text-sm font-mono flex-1 font-bold text-black">{color}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hint */}
            <div className="bg-[#F4C152] border-2 border-black rounded-[4px] p-6" style={{ boxShadow: '4px 4px 0px #000000' }}>
              <p className="text-sm text-black font-bold">
                <strong className="font-black">💡 Consejo:</strong> Mantén presionado sobre la paleta de colores para arrastrarla y reposicionarla en tu diseño.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Color Detail Modal */}
      {selectedColor && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
          onClick={() => setSelectedColor(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white border-2 border-black rounded-[4px] p-8 max-w-sm w-full"
            style={{ boxShadow: '8px 8px 0px #000000' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-black text-black">Detalle de Color</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedColor(null)}
                className="border-2 border-black bg-white hover:bg-[#FAF3DD]"
                style={{ boxShadow: '2px 2px 0px #000000' }}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="space-y-6">
              {/* Color Preview */}
              <div
                className="w-full h-32 rounded-[4px] border-2 border-black"
                style={{ backgroundColor: selectedColor, boxShadow: '4px 4px 0px #000000' }}
              />

              {/* HEX Code */}
              <div>
                <label className="text-sm font-black text-black mb-2 block">
                  Código HEX
                </label>
                <div className="flex gap-2">
                  <Input
                    value={selectedColor}
                    readOnly
                    className="font-mono border-2 border-black bg-white font-bold"
                    style={{ boxShadow: '2px 2px 0px #000000' }}
                  />
                  <Button
                    onClick={() => handleCopyColor(selectedColor)}
                    className="bg-[#F4C152] hover:bg-[#F4C152]/90 text-black border-2 border-black font-black"
                    style={{ boxShadow: '2px 2px 0px #000000' }}
                  >
                    {copiedColor === selectedColor ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              <p className="text-sm text-black/70 font-medium">
                Copia este código para usarlo en tus otros proyectos de diseño
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}