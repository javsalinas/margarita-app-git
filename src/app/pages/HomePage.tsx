import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus, LogOut, Palette, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getProjects, getUser, clearUser, type Project } from '../utils/storage';

export default function HomePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [user, setUser] = useState(getUser());

  useEffect(() => {
    // Verificar autenticación
    const currentUser = getUser();
    if (!currentUser) {
      navigate('/');
      return;
    }

    // Cargar proyectos
    const loadedProjects = getProjects();
    setProjects(loadedProjects);
  }, [navigate]);

  const handleLogout = () => {
    clearUser();
    navigate('/');
  };

  const handleCreateProject = () => {
    navigate('/editor/new');
  };

  const handleOpenProject = (projectId: string) => {
    navigate(`/editor/${projectId}`);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return 'Hoy';
    } else if (diffInHours < 48) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF3DD]">
      {/* Header */}
      <header className="bg-[#B7E4C7] border-b-2 border-black">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[4px] bg-[#F4C152] border-2 border-black flex items-center justify-center" style={{ boxShadow: '2px 2px 0px #000000' }}>
              <span className="text-xl">🌸</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-black">Margarita App</h1>
              <p className="text-sm text-black font-medium">Hola, {user?.name}</p>
            </div>
          </div>

          <Button 
            variant="ghost" 
            onClick={handleLogout}
            className="border-2 border-black bg-white hover:bg-[#FAF3DD] font-bold"
            style={{ boxShadow: '2px 2px 0px #000000' }}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-4xl font-black mb-2 text-black">Mis Proyectos</h2>
            <p className="text-black font-bold">
              {projects.length} {projects.length === 1 ? 'diseño' : 'diseños'} guardados
            </p>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-[4px] bg-[#F4C152] border-2 border-black mb-6" style={{ boxShadow: '4px 4px 0px #000000' }}>
              <Palette className="w-10 h-10 text-black" />
            </div>
            <h3 className="text-2xl font-black mb-2 text-black">No tienes proyectos aún</h3>
            <p className="text-black font-bold mb-6">
              Crea tu primer diseño editorial con paleta inteligente
            </p>
            <Button
              size="lg"
              className="bg-[#F4C152] hover:bg-[#F4C152]/90 text-black border-2 border-black font-black"
              style={{ boxShadow: '4px 4px 0px #000000' }}
              onClick={handleCreateProject}
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Proyecto
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group bg-white rounded-[4px] border-2 border-black overflow-hidden cursor-pointer transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]"
                style={{ boxShadow: '4px 4px 0px #000000' }}
                onClick={() => handleOpenProject(project.id)}
              >
                {/* Thumbnail */}
                <div className="aspect-[3/4] bg-[#FAF3DD] relative overflow-hidden border-b-2 border-black">
                  {project.thumbnail ? (
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Palette className="w-12 h-12 text-black" />
                    </div>
                  )}
                  
                  {/* Color Palette Preview */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    {project.colors.slice(0, 3).map((color, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-full border-2 border-black"
                        style={{ backgroundColor: color, boxShadow: '2px 2px 0px #000000' }}
                      />
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 bg-white">
                  <h3 className="font-black mb-1 truncate text-black">{project.name}</h3>
                  <div className="flex items-center justify-between text-sm text-black font-bold">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(project.updatedAt)}
                    </span>
                    <span className="text-xs bg-[#F4C152] border border-black px-2 py-1 rounded-[2px]">
                      {project.format === '9:16' ? 'Story' : project.format === '1:1' ? 'Cuadrado' : 'Feed'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating Action Button */}
      <button
        className="fixed bottom-8 right-8 w-16 h-16 rounded-[4px] bg-[#F4C152] hover:bg-[#F4C152]/90 border-2 border-black flex items-center justify-center text-black transition-all hover:translate-x-[-2px] hover:translate-y-[-2px]"
        style={{ boxShadow: '6px 6px 0px #000000' }}
        onClick={handleCreateProject}
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}