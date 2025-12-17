import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { groupsAPI } from '@/services/api';
import { Users, Copy, Check, Trophy } from 'lucide-react';

export default function Groups() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedCode, setCopiedCode] = useState(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    try {
      const response = await groupsAPI.getMy();
      setGroups(response.data);
    } catch (err) {
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <Navigate to="/login" />;
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;

    setSaving(true);
    try {
      const response = await groupsAPI.create(newGroupName.trim());
      setGroups([...groups, { ...response.data, member_count: 1, owner_name: user.name }]);
      setNewGroupName('');
      setCreateOpen(false);
      setMessage({ type: 'success', text: `Grupo "${response.data.name}" creado. Código: ${response.data.code}` });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al crear el grupo' });
    } finally {
      setSaving(false);
    }
  };

  const handleJoinGroup = async () => {
    if (!joinCode.trim()) return;

    setSaving(true);
    try {
      const response = await groupsAPI.join(joinCode.trim());
      await loadGroups(); // Reload to get full group data
      setJoinCode('');
      setJoinOpen(false);
      setMessage({ type: 'success', text: `Te has unido a "${response.data.group.name}"` });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Error al unirse al grupo';
      setMessage({ type: 'error', text: errorMsg });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setSaving(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const openLeaderboard = async (group) => {
    setSelectedGroup(group);
    setLeaderboardOpen(true);
    setLoadingLeaderboard(true);
    try {
      const response = await groupsAPI.getLeaderboard(group.id);
      setLeaderboard(response.data);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
      setLeaderboard([]);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users className="h-6 w-6" />
          Mis Grupos
        </h1>
        <div className="flex gap-2">
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">Unirse</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Unirse a un Grupo</DialogTitle>
                <DialogDescription>
                  Ingresa el código del grupo al que quieres unirte
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="joinCode">Código del Grupo</Label>
                  <Input
                    id="joinCode"
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                </div>
                <Button onClick={handleJoinGroup} className="w-full" disabled={saving || !joinCode.trim()}>
                  {saving ? 'Uniéndose...' : 'Unirse'}
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
                  Crea un grupo privado para competir con amigos y familia
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
                <Button onClick={handleCreateGroup} className="w-full" disabled={saving || !newGroupName.trim()}>
                  {saving ? 'Creando...' : 'Crear Grupo'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {message.text && (
        <Alert className="mb-6" variant={message.type === 'error' ? 'destructive' : 'default'}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {groups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">
              No perteneces a ningún grupo todavía
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
      ) : (
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
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Miembros</span>
                    <span className="font-medium">{group.member_count}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Código</span>
                    <button
                      onClick={() => copyCode(group.code)}
                      className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs font-mono hover:bg-muted/80 transition-colors"
                    >
                      {group.code}
                      {copiedCode === group.code ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => openLeaderboard(group)}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    Ver Ranking
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Leaderboard Modal */}
      <Dialog open={leaderboardOpen} onOpenChange={setLeaderboardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              {selectedGroup?.name}
            </DialogTitle>
            <DialogDescription>
              Ranking del grupo
            </DialogDescription>
          </DialogHeader>
          {loadingLeaderboard ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hay miembros con predicciones aún
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {leaderboard.map((member, index) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${member.id === user.id ? 'bg-primary/10' : ''}`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-yellow-400 text-yellow-900' :
                    index === 1 ? 'bg-gray-300 text-gray-700' :
                    index === 2 ? 'bg-amber-600 text-amber-100' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <span className={member.id === user.id ? 'font-medium text-primary' : ''}>
                      {member.username || member.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold">{member.total_points}</span>
                    <span className="text-xs text-muted-foreground ml-1">pts</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
