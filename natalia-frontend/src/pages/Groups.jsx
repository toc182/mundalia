import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([
    { id: 1, name: 'Familia', code: 'FAM123', member_count: 8, owner_name: 'Usuario Demo' },
    { id: 2, name: 'Trabajo', code: 'TRB456', member_count: 15, owner_name: 'Carlos M.' },
  ]);
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const newGroup = {
      id: groups.length + 1,
      name: newGroupName,
      code,
      member_count: 1,
      owner_name: user.name
    };

    setGroups([...groups, newGroup]);
    setNewGroupName('');
    setCreateOpen(false);
    setMessage(`Grupo "${newGroupName}" creado. Codigo: ${code}`);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleJoinGroup = () => {
    if (!joinCode.trim()) return;

    // Mock join - in production this would call the API
    setJoinCode('');
    setJoinOpen(false);
    setMessage('Te has unido al grupo correctamente');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Mis Grupos</h1>
        <div className="flex gap-2">
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Unirse a Grupo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unirse a un Grupo</DialogTitle>
                <DialogDescription>
                  Ingresa el codigo del grupo al que quieres unirte
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="joinCode">Codigo del Grupo</Label>
                  <Input
                    id="joinCode"
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                </div>
                <Button onClick={handleJoinGroup} className="w-full">
                  Unirse
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>Crear Grupo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Crear Nuevo Grupo</DialogTitle>
                <DialogDescription>
                  Crea un grupo privado para competir con amigos
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">Nombre del Grupo</Label>
                  <Input
                    id="groupName"
                    placeholder="Ej: Familia, Amigos, Trabajo..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateGroup} className="w-full">
                  Crear Grupo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {message && (
        <Alert className="mb-6">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map(group => (
          <Card key={group.id}>
            <CardHeader>
              <CardTitle>{group.name}</CardTitle>
              <CardDescription>
                Creado por {group.owner_name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Miembros</span>
                  <span className="font-medium">{group.member_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Codigo</span>
                  <code className="bg-muted px-2 py-1 rounded text-xs font-mono">
                    {group.code}
                  </code>
                </div>
                <Button variant="outline" className="w-full" size="sm">
                  Ver Ranking
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {groups.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No perteneces a ningun grupo todavia
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setJoinOpen(true)}>
                Unirse a un Grupo
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                Crear Grupo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
