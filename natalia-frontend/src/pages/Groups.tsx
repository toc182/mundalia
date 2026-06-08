import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { groupsAPI } from '@/services/api';
import { Users, Copy, Check, Trophy } from 'lucide-react';
import type { PrivateGroup } from '@/types';

interface Message {
  type: 'success' | 'error' | '';
  text: string;
}

export default function Groups(): JSX.Element {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [newGroupName, setNewGroupName] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [message, setMessage] = useState<Message>({ type: '', text: '' });
  const [createOpen, setCreateOpen] = useState<boolean>(false);
  const [joinOpen, setJoinOpen] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Timer refs for cleanup
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null);
  const copyTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const loadGroups = async (): Promise<void> => {
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

  const handleCreateGroup = async (): Promise<void> => {
    if (!newGroupName.trim()) return;

    setSaving(true);
    try {
      const response = await groupsAPI.create(newGroupName.trim());
      setGroups([...groups, { ...response.data, member_count: 1, owner_name: user.name }]);
      setNewGroupName('');
      setCreateOpen(false);
      setMessage({ type: 'success', text: t('privateGroups.groupCreated', { name: response.data.name, code: response.data.code }) });
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      messageTimerRef.current = setTimeout(() => setMessage({ type: '', text: '' }), 5000);
    } catch (err) {
      setMessage({ type: 'error', text: t('privateGroups.createError') });
    } finally {
      setSaving(false);
    }
  };

  const handleJoinGroup = async (): Promise<void> => {
    if (!joinCode.trim()) return;

    setSaving(true);
    try {
      const response = await groupsAPI.join(joinCode.trim());
      await loadGroups(); // Reload to get full group data
      setJoinCode('');
      setJoinOpen(false);
      setMessage({ type: 'success', text: t('privateGroups.joinedGroup', { name: response.data.group.name }) });
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      messageTimerRef.current = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || t('privateGroups.joinError');
      setMessage({ type: 'error', text: errorMsg });
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
      messageTimerRef.current = setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } finally {
      setSaving(false);
    }
  };

  const copyCode = (code: string): void => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopiedCode(null), 2000);
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
          {t('privateGroups.title')}
        </h1>
        <div className="flex gap-2">
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">{t('privateGroups.joinGroup')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('privateGroups.joinGroup')}</DialogTitle>
                <DialogDescription>
                  {t('privateGroups.enterCode')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="joinCode">{t('privateGroups.groupCode')}</Label>
                  <Input
                    id="joinCode"
                    placeholder="ABC123"
                    value={joinCode}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                  />
                </div>
                <Button onClick={handleJoinGroup} className="w-full" disabled={saving || !joinCode.trim()}>
                  {saving ? t('privateGroups.joining') : t('privateGroups.joinGroup')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>{t('privateGroups.createGroup')}</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('privateGroups.createGroup')}</DialogTitle>
                <DialogDescription>
                  {t('privateGroups.createDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="groupName">{t('privateGroups.groupName')}</Label>
                  <Input
                    id="groupName"
                    placeholder={t('privateGroups.groupNamePlaceholder')}
                    value={newGroupName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewGroupName(e.target.value)}
                  />
                </div>
                <Button onClick={handleCreateGroup} className="w-full" disabled={saving || !newGroupName.trim()}>
                  {saving ? t('common.creating') : t('privateGroups.createGroup')}
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
              {t('privateGroups.noGroups')}
            </p>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setJoinOpen(true)}>
                {t('privateGroups.joinGroup')}
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                {t('privateGroups.createGroup')}
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
                  {t('privateGroups.createdBy')} {group.owner_name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t('privateGroups.members')}</span>
                    <span className="font-medium">{group.member_count}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{t('privateGroups.groupCode')}</span>
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
                    onClick={() => navigate(`/mis-grupos/${group.id}`)}
                  >
                    <Trophy className="h-4 w-4 mr-2" />
                    {t('privateGroups.viewRanking')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
