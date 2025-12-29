import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StatsTabProps } from '@/types/admin';

export function StatsTab({ stats }: StatsTabProps): JSX.Element {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats?.total_users || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Predicciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats?.total_predictions || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">Progreso Resultados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Repechajes:</span>
              <span className="font-medium">{stats?.playoffs_entered || 0}/6</span>
            </div>
            <div className="flex justify-between">
              <span>Grupos:</span>
              <span className="font-medium">{stats?.groups_entered || 0}/12</span>
            </div>
            <div className="flex justify-between">
              <span>Eliminatorias:</span>
              <span className="font-medium">{stats?.knockout_entered || 0}/32</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default StatsTab;
