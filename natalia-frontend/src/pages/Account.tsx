import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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

interface Country {
  code: string;
  name: string;
}

// Lista de países - todos los del mundo, ordenados alfabéticamente en español
const COUNTRIES: Country[] = [
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

type UsernameStatus = null | 'checking' | 'available' | 'taken' | 'invalid';

// Formatear fecha para input type="date" (YYYY-MM-DD)
const formatDateForInput = (date: string | undefined): string => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

export default function Account(): JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser, logout } = useAuth();
  const [name, setName] = useState<string>(user?.name || '');
  const [username, setUsername] = useState<string>(user?.username || '');
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>(null);
  const [country, setCountry] = useState<string>(user?.country || 'none');
  const [birthDate, setBirthDate] = useState<string>(formatDateForInput(user?.birth_date) || '');
  const [saving, setSaving] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Timer ref for cleanup
  const savedTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  // Check username availability with debounce
  const checkUsername = useCallback(async (value: string): Promise<void> => {
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

  const handleSave = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
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
    } catch (err: any) {
      setError(err.response?.data?.error || t('errors.savingFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = (): void => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertDescription>{t('errors.unauthorized')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">{t('account.title')}</h1>

      {saved && (
        <Alert className="mb-6">
          <AlertDescription>{t('account.saved')}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">{t('account.personalInfo')}</CardTitle>
          <CardDescription>{t('account.editProfile')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t('common.name')}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                placeholder={t('auth.namePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <AtSign className="h-4 w-4" />
                {t('account.username')}
              </Label>
              <div className="relative">
                <Input
                  id="username"
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
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
                {usernameStatus === 'taken' ? t('account.usernameTaken') :
                 usernameStatus === 'invalid' ? t('account.usernameInvalid') :
                 t('account.usernameHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                {t('common.email')}
              </Label>
              <Input
                value={user.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                {t('account.emailNoChange')}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-4">
                <Label className="flex items-center gap-2 whitespace-nowrap">
                  <Globe className="h-4 w-4" />
                  {t('account.country')}
                </Label>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder={t('account.selectCountry')} />
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
                {t('account.countryHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="birthDate" className="flex items-center gap-2">
                <Cake className="h-4 w-4" />
                {t('account.birthDate')}
              </Label>
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBirthDate(e.target.value)}
                onClick={(e: React.MouseEvent<HTMLInputElement>) => (e.target as HTMLInputElement).showPicker?.()}
                max={new Date().toISOString().split('T')[0]}
              />
              <p className="text-xs text-muted-foreground">
                {t('account.birthDateHint')}
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                {t('account.memberSince')}
              </Label>
              <Input
                value={new Date(user.created_at!).toLocaleDateString()}
                disabled
                className="bg-muted"
              />
            </div>

            <Button type="submit" disabled={saving || !name.trim()}>
              {saving ? t('common.loading') : t('account.saveChanges')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-lg text-red-600">{t('nav.logout')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {t('account.logoutWarning')}
          </p>
          <Button variant="destructive" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            {t('nav.logout')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
