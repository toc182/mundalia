import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { authAPI } from '@/services/api';
import { User, Mail, Calendar, LogOut, Globe, Cake, AtSign, Check, X } from 'lucide-react';

// Lista de países - todos los del mundo, ordenados alfabéticamente en español
const COUNTRIES = [
  { code: '', name: 'Seleccionar país...' },
  { code: 'AF', name: 'Afganistán' },
  { code: 'AL', name: 'Albania' },
  { code: 'DE', name: 'Alemania' },
  { code: 'AD', name: 'Andorra' },
  { code: 'AO', name: 'Angola' },
  { code: 'AG', name: 'Antigua y Barbuda' },
  { code: 'SA', name: 'Arabia Saudita' },
  { code: 'DZ', name: 'Argelia' },
  { code: 'AR', name: 'Argentina' },
  { code: 'AM', name: 'Armenia' },
  { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' },
  { code: 'AZ', name: 'Azerbaiyán' },
  { code: 'BS', name: 'Bahamas' },
  { code: 'BD', name: 'Bangladés' },
  { code: 'BB', name: 'Barbados' },
  { code: 'BH', name: 'Baréin' },
  { code: 'BE', name: 'Bélgica' },
  { code: 'BZ', name: 'Belice' },
  { code: 'BJ', name: 'Benín' },
  { code: 'BY', name: 'Bielorrusia' },
  { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia y Herzegovina' },
  { code: 'BW', name: 'Botsuana' },
  { code: 'BR', name: 'Brasil' },
  { code: 'BN', name: 'Brunéi' },
  { code: 'BG', name: 'Bulgaria' },
  { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' },
  { code: 'BT', name: 'Bután' },
  { code: 'CV', name: 'Cabo Verde' },
  { code: 'KH', name: 'Camboya' },
  { code: 'CM', name: 'Camerún' },
  { code: 'CA', name: 'Canadá' },
  { code: 'QA', name: 'Catar' },
  { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' },
  { code: 'CN', name: 'China' },
  { code: 'CY', name: 'Chipre' },
  { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoras' },
  { code: 'KP', name: 'Corea del Norte' },
  { code: 'KR', name: 'Corea del Sur' },
  { code: 'CI', name: 'Costa de Marfil' },
  { code: 'CR', name: 'Costa Rica' },
  { code: 'HR', name: 'Croacia' },
  { code: 'CU', name: 'Cuba' },
  { code: 'DK', name: 'Dinamarca' },
  { code: 'DM', name: 'Dominica' },
  { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egipto' },
  { code: 'SV', name: 'El Salvador' },
  { code: 'AE', name: 'Emiratos Árabes Unidos' },
  { code: 'ER', name: 'Eritrea' },
  { code: 'SK', name: 'Eslovaquia' },
  { code: 'SI', name: 'Eslovenia' },
  { code: 'ES', name: 'España' },
  { code: 'US', name: 'Estados Unidos' },
  { code: 'EE', name: 'Estonia' },
  { code: 'ET', name: 'Etiopía' },
  { code: 'PH', name: 'Filipinas' },
  { code: 'FI', name: 'Finlandia' },
  { code: 'FJ', name: 'Fiyi' },
  { code: 'FR', name: 'Francia' },
  { code: 'GA', name: 'Gabón' },
  { code: 'GM', name: 'Gambia' },
  { code: 'GE', name: 'Georgia' },
  { code: 'GH', name: 'Ghana' },
  { code: 'GD', name: 'Granada' },
  { code: 'GR', name: 'Grecia' },
  { code: 'GT', name: 'Guatemala' },
  { code: 'GN', name: 'Guinea' },
  { code: 'GQ', name: 'Guinea Ecuatorial' },
  { code: 'GW', name: 'Guinea-Bisáu' },
  { code: 'GY', name: 'Guyana' },
  { code: 'HT', name: 'Haití' },
  { code: 'HN', name: 'Honduras' },
  { code: 'HU', name: 'Hungría' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IQ', name: 'Irak' },
  { code: 'IR', name: 'Irán' },
  { code: 'IE', name: 'Irlanda' },
  { code: 'IS', name: 'Islandia' },
  { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italia' },
  { code: 'JM', name: 'Jamaica' },
  { code: 'JP', name: 'Japón' },
  { code: 'JO', name: 'Jordania' },
  { code: 'KZ', name: 'Kazajistán' },
  { code: 'KE', name: 'Kenia' },
  { code: 'KG', name: 'Kirguistán' },
  { code: 'KI', name: 'Kiribati' },
  { code: 'KW', name: 'Kuwait' },
  { code: 'LA', name: 'Laos' },
  { code: 'LS', name: 'Lesoto' },
  { code: 'LV', name: 'Letonia' },
  { code: 'LB', name: 'Líbano' },
  { code: 'LR', name: 'Liberia' },
  { code: 'LY', name: 'Libia' },
  { code: 'LI', name: 'Liechtenstein' },
  { code: 'LT', name: 'Lituania' },
  { code: 'LU', name: 'Luxemburgo' },
  { code: 'MK', name: 'Macedonia del Norte' },
  { code: 'MG', name: 'Madagascar' },
  { code: 'MY', name: 'Malasia' },
  { code: 'MW', name: 'Malaui' },
  { code: 'MV', name: 'Maldivas' },
  { code: 'ML', name: 'Malí' },
  { code: 'MT', name: 'Malta' },
  { code: 'MA', name: 'Marruecos' },
  { code: 'MU', name: 'Mauricio' },
  { code: 'MR', name: 'Mauritania' },
  { code: 'MX', name: 'México' },
  { code: 'FM', name: 'Micronesia' },
  { code: 'MD', name: 'Moldavia' },
  { code: 'MC', name: 'Mónaco' },
  { code: 'MN', name: 'Mongolia' },
  { code: 'ME', name: 'Montenegro' },
  { code: 'MZ', name: 'Mozambique' },
  { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' },
  { code: 'NR', name: 'Nauru' },
  { code: 'NP', name: 'Nepal' },
  { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Níger' },
  { code: 'NG', name: 'Nigeria' },
  { code: 'NO', name: 'Noruega' },
  { code: 'NZ', name: 'Nueva Zelanda' },
  { code: 'OM', name: 'Omán' },
  { code: 'NL', name: 'Países Bajos' },
  { code: 'PK', name: 'Pakistán' },
  { code: 'PW', name: 'Palaos' },
  { code: 'PA', name: 'Panamá' },
  { code: 'PG', name: 'Papúa Nueva Guinea' },
  { code: 'PY', name: 'Paraguay' },
  { code: 'PE', name: 'Perú' },
  { code: 'PL', name: 'Polonia' },
  { code: 'PT', name: 'Portugal' },
  { code: 'PR', name: 'Puerto Rico' },
  { code: 'GB', name: 'Reino Unido' },
  { code: 'CF', name: 'República Centroafricana' },
  { code: 'CZ', name: 'República Checa' },
  { code: 'CG', name: 'República del Congo' },
  { code: 'CD', name: 'República Democrática del Congo' },
  { code: 'DO', name: 'República Dominicana' },
  { code: 'RW', name: 'Ruanda' },
  { code: 'RO', name: 'Rumania' },
  { code: 'RU', name: 'Rusia' },
  { code: 'WS', name: 'Samoa' },
  { code: 'KN', name: 'San Cristóbal y Nieves' },
  { code: 'SM', name: 'San Marino' },
  { code: 'VC', name: 'San Vicente y las Granadinas' },
  { code: 'LC', name: 'Santa Lucía' },
  { code: 'ST', name: 'Santo Tomé y Príncipe' },
  { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' },
  { code: 'SC', name: 'Seychelles' },
  { code: 'SL', name: 'Sierra Leona' },
  { code: 'SG', name: 'Singapur' },
  { code: 'SY', name: 'Siria' },
  { code: 'SO', name: 'Somalia' },
  { code: 'LK', name: 'Sri Lanka' },
  { code: 'SZ', name: 'Suazilandia' },
  { code: 'ZA', name: 'Sudáfrica' },
  { code: 'SD', name: 'Sudán' },
  { code: 'SS', name: 'Sudán del Sur' },
  { code: 'SE', name: 'Suecia' },
  { code: 'CH', name: 'Suiza' },
  { code: 'SR', name: 'Surinam' },
  { code: 'TH', name: 'Tailandia' },
  { code: 'TW', name: 'Taiwán' },
  { code: 'TZ', name: 'Tanzania' },
  { code: 'TJ', name: 'Tayikistán' },
  { code: 'TL', name: 'Timor Oriental' },
  { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' },
  { code: 'TT', name: 'Trinidad y Tobago' },
  { code: 'TN', name: 'Túnez' },
  { code: 'TM', name: 'Turkmenistán' },
  { code: 'TR', name: 'Turquía' },
  { code: 'TV', name: 'Tuvalu' },
  { code: 'UA', name: 'Ucrania' },
  { code: 'UG', name: 'Uganda' },
  { code: 'UY', name: 'Uruguay' },
  { code: 'UZ', name: 'Uzbekistán' },
  { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vaticano' },
  { code: 'VE', name: 'Venezuela' },
  { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' },
  { code: 'DJ', name: 'Yibuti' },
  { code: 'ZM', name: 'Zambia' },
  { code: 'ZW', name: 'Zimbabue' },
];

// Formatear fecha para input type="date" (YYYY-MM-DD)
const formatDateForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

export default function Account() {
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [usernameStatus, setUsernameStatus] = useState(null); // null, 'checking', 'available', 'taken', 'invalid'
  const [country, setCountry] = useState(user?.country || 'none');
  const [birthDate, setBirthDate] = useState(formatDateForInput(user?.birth_date) || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  // Timer ref for cleanup
  const savedTimerRef = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Check username availability with debounce
  const checkUsername = useCallback(async (value) => {
    if (!value || value === user?.username) {
      setUsernameStatus(null);
      return;
    }

    // Validate format first
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(value)) {
      setUsernameStatus('invalid');
      return;
    }

    setUsernameStatus('checking');
    try {
      const response = await authAPI.checkUsername(value);
      setUsernameStatus(response.data.available ? 'available' : 'taken');
    } catch {
      setUsernameStatus(null);
    }
  }, [user?.username]);

  // Debounced username check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkUsername(username);
    }, 500);
    return () => clearTimeout(timer);
  }, [username, checkUsername]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (usernameStatus === 'taken' || usernameStatus === 'invalid') return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const response = await authAPI.updateProfile({
        name: name.trim(),
        username: username.trim() || null,
        country: country === 'none' ? null : country,
        birth_date: birthDate || null,
      });
      updateUser(response.data);
      setSaved(true);
      setUsernameStatus(null); // Reset status since it's now the user's username
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar cambios');
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
              <Label htmlFor="username" className="flex items-center gap-2">
                <AtSign className="h-4 w-4" />
                Username
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="tu_username"
                  maxLength={20}
                  className={usernameStatus === 'taken' || usernameStatus === 'invalid' ? 'border-red-500 pr-10' : usernameStatus === 'available' ? 'border-green-500 pr-10' : ''}
                />
                {usernameStatus === 'checking' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
                  </div>
                )}
                {usernameStatus === 'available' && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
                {(usernameStatus === 'taken' || usernameStatus === 'invalid') && (
                  <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500" />
                )}
              </div>
              <p className={`text-xs ${usernameStatus === 'taken' ? 'text-red-500' : usernameStatus === 'invalid' ? 'text-red-500' : 'text-muted-foreground'}`}>
                {usernameStatus === 'taken' ? 'Este username ya está en uso' :
                 usernameStatus === 'invalid' ? '3-20 caracteres (letras, números, _)' :
                 'Único - se mostrará en el leaderboard'}
              </p>
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
              <div className="flex items-center gap-4">
                <Label className="flex items-center gap-2 whitespace-nowrap">
                  <Globe className="h-4 w-4" />
                  País
                </Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Seleccionar país..." />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((c) => (
                      <SelectItem key={c.code || 'empty'} value={c.code || 'none'}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">
                Opcional - se mostrará en el leaderboard
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate" className="flex items-center gap-2">
                <Cake className="h-4 w-4" />
                Fecha de nacimiento
              </Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                onClick={(e) => e.target.showPicker?.()}
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                Opcional - no se mostrará públicamente
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
