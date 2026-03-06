import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Plus, LogOut, Palette, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { getProjects, getUser, clearUser, type Project } from '../utils/storage';

export default function HomePage() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const user = getUser();

  useEffect(() => {
    // Verificar autenticación
    if (!user) {
      navigate('/');
      return;
    }

    // Cargar proyectos
    const loadedProjects = getProjects();
    setProjects(loadedProjects);
  }, [user, navigate]);

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
              <span className="text-xl">🌸</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">Margarita App</h1>
              <p className="text-sm text-gray-600">Hola, {user?.name}</p>
            </div>
          </div>

          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Salir
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold mb-2">Mis Proyectos</h2>
            <p className="text-gray-600">
              {projects.length} {projects.length === 1 ? 'diseño' : 'diseños'} guardados
            </p>
          </div>
        </div>

        {/* Projects Grid */}
        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 mb-6">
              <Palette className="w-10 h-10 text-purple-600" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No tienes proyectos aún</h3>
            <p className="text-gray-600 mb-6">
              Crea tu primer diseño editorial con paleta inteligente
            </p>
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
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
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all cursor-pointer"
                onClick={() => handleOpenProject(project.id)}
              >
                {/* Thumbnail */}
                <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
                  {project.thumbnail ? (
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Palette className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  
                  {/* Color Palette Preview */}
                  <div className="absolute top-4 right-4 flex flex-col gap-2">
                    {project.colors.slice(0, 3).map((color, idx) => (
                      <div
                        key={idx}
                        className="w-8 h-8 rounded-full border-2 border-white shadow-lg"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4">
                  <h3 className="font-semibold mb-1 truncate">{project.name}</h3>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(project.updatedAt)}
                    </span>
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
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
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-2xl flex items-center justify-center text-white transition-transform hover:scale-110"
        onClick={handleCreateProject}
      >
        <Plus className="w-8 h-8" />
      </button>
    </div>
  );
}
