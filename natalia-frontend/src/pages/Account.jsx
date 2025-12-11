import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api';
import { User, Mail, Calendar, LogOut } from 'lucide-react';

export default function Account() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await authAPI.updateProfile(name.trim());
      updateUser(response.data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>Debes iniciar sesion para ver esta pagina</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Mi Cuenta</h1>

      {saved && (
        <Alert className="mb-6">
          <AlertDescription>Cambios guardados correctamente</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Informacion de la Cuenta</CardTitle>
          <CardDescription>Edita tu perfil</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nombre
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                El email no se puede cambiar
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Miembro desde
              </Label>
              <Input
                value={new Date(user.created_at).toLocaleDateString('es-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                disabled
                className="bg-muted"
              />
            </div>

            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-lg text-red-600">Cerrar Sesion</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Al cerrar sesion, tendras que volver a iniciar sesion para acceder a tus predicciones.
          </p>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesion
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
