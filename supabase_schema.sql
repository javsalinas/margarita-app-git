-- Esquema de Base de Datos para Margarita App

-- Tabla de Proyectos
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL DEFAULT 'Sin título',
  image_url TEXT, -- URL de la imagen en Supabase Storage
  colors JSONB NOT NULL DEFAULT '[]', -- Array de colores HEX
  format TEXT NOT NULL DEFAULT '9:16',
  palette_position JSONB NOT NULL DEFAULT '{"x": 80, "y": 10}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de Fuentes Personalizadas
CREATE TABLE IF NOT EXISTS custom_fonts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  font_url TEXT NOT NULL, -- URL del archivo .ttf/.otf en Storage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de Seguridad (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fonts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Los usuarios pueden ver sus propios proyectos" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden crear sus propios proyectos" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden actualizar sus propios proyectos" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Los usuarios pueden borrar sus propios proyectos" ON projects
  FOR DELETE USING (auth.uid() = user_id);
