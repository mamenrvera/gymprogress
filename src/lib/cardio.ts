/**
 * Catálogo de actividades de cardio y deportes de GymProgress.
 * Define tipos, categorías, etiquetas y qué campos son relevantes para cada actividad.
 */

export type CardioIntensity = 'suave' | 'moderada' | 'alta' | 'muy_alta'

export const CARDIO_INTENSITIES: { value: CardioIntensity; label: string }[] = [
  { value: 'suave', label: 'Suave' },
  { value: 'moderada', label: 'Moderada' },
  { value: 'alta', label: 'Alta' },
  { value: 'muy_alta', label: 'Muy alta' },
]

export const INTENSITY_LABELS: Record<CardioIntensity, string> = {
  suave: 'Suave',
  moderada: 'Moderada',
  alta: 'Alta',
  muy_alta: 'Muy alta',
}

export type ActivityCategory = 'maquinas' | 'aire_libre' | 'raqueta' | 'otros'

export type ActivityType =
  | 'cinta_correr'
  | 'cinta_andar'
  | 'cinta_inclinada'
  | 'bici_estatica'
  | 'spinning'
  | 'eliptica'
  | 'escaladora'
  | 'remo'
  | 'correr_aire'
  | 'caminar_aire'
  | 'senderismo'
  | 'ciclismo'
  | 'trail'
  | 'padel'
  | 'tenis'
  | 'badminton'
  | 'squash'
  | 'natacion'
  | 'zumba'
  | 'clase_dirigida'
  | 'boxeo'
  | 'deporte_equipo'
  | 'personalizado'

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  cinta_correr: 'Cinta de correr',
  cinta_andar: 'Cinta andando',
  cinta_inclinada: 'Cinta con inclinación',
  bici_estatica: 'Bicicleta estática',
  spinning: 'Bicicleta de spinning',
  eliptica: 'Elíptica',
  escaladora: 'Escaladora',
  remo: 'Remo ergómetro',
  correr_aire: 'Correr al aire libre',
  caminar_aire: 'Caminar al aire libre',
  senderismo: 'Senderismo',
  ciclismo: 'Ciclismo',
  trail: 'Trail running',
  padel: 'Pádel',
  tenis: 'Tenis',
  badminton: 'Bádminton',
  squash: 'Squash',
  natacion: 'Natación',
  zumba: 'Zumba',
  clase_dirigida: 'Clase dirigida',
  boxeo: 'Boxeo / combate',
  deporte_equipo: 'Deporte de equipo',
  personalizado: 'Actividad personalizada',
}

export const ACTIVITY_CATEGORY: Record<ActivityType, ActivityCategory> = {
  cinta_correr: 'maquinas',
  cinta_andar: 'maquinas',
  cinta_inclinada: 'maquinas',
  bici_estatica: 'maquinas',
  spinning: 'maquinas',
  eliptica: 'maquinas',
  escaladora: 'maquinas',
  remo: 'maquinas',
  correr_aire: 'aire_libre',
  caminar_aire: 'aire_libre',
  senderismo: 'aire_libre',
  ciclismo: 'aire_libre',
  trail: 'aire_libre',
  padel: 'raqueta',
  tenis: 'raqueta',
  badminton: 'raqueta',
  squash: 'raqueta',
  natacion: 'otros',
  zumba: 'otros',
  clase_dirigida: 'otros',
  boxeo: 'otros',
  deporte_equipo: 'otros',
  personalizado: 'otros',
}

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  maquinas: 'Cardio en máquinas',
  aire_libre: 'Carrera y actividades al aire libre',
  raqueta: 'Deportes de raqueta',
  otros: 'Otros deportes y clases',
}

export const ACTIVITY_CATEGORY_ORDER: ActivityCategory[] = ['maquinas', 'aire_libre', 'raqueta', 'otros']

export type CardioModality = 'individual' | 'dobles' | 'clase' | 'entrenamiento'
export const MODALITY_LABELS: Record<CardioModality, string> = {
  individual: 'Individual',
  dobles: 'Dobles',
  clase: 'Clase',
  entrenamiento: 'Entrenamiento',
}

export type CaloriesSource = 'auto' | 'dispositivo' | 'manual'
export const CALORIES_SOURCE_LABELS: Record<CaloriesSource, string> = {
  auto: 'Estimación automática',
  dispositivo: 'Dispositivo',
  manual: 'Manual',
}

// Which specific fields are relevant per activity type
export type CardioField =
  | 'distance'
  | 'avgSpeed'
  | 'maxSpeed'
  | 'avgIncline'
  | 'maxIncline'
  | 'runWalk'
  | 'warmupCooldown'
  | 'resistance'
  | 'cadence'
  | 'elevation'
  | 'surface'
  | 'modality'
  | 'sets'
  | 'result'

const INCLINE_FIELDS: CardioField[] = ['avgIncline', 'maxIncline']

export const ACTIVITY_FIELDS: Record<ActivityType, CardioField[]> = {
  cinta_correr: ['distance', 'avgSpeed', 'maxSpeed', ...INCLINE_FIELDS, 'runWalk', 'warmupCooldown'],
  cinta_andar: ['distance', 'avgSpeed', 'maxSpeed', ...INCLINE_FIELDS],
  cinta_inclinada: ['distance', 'avgSpeed', 'maxSpeed', ...INCLINE_FIELDS, 'runWalk', 'warmupCooldown'],
  bici_estatica: ['distance', 'avgSpeed', 'maxSpeed', 'resistance', 'cadence'],
  spinning: ['distance', 'avgSpeed', 'maxSpeed', 'resistance', 'cadence'],
  eliptica: ['distance', 'avgSpeed', 'resistance', 'cadence'],
  escaladora: ['distance', 'avgSpeed', 'resistance', 'elevation'],
  remo: ['distance', 'avgSpeed', 'resistance', 'cadence'],
  correr_aire: ['distance', 'avgSpeed', 'maxSpeed', 'elevation', 'surface'],
  caminar_aire: ['distance', 'avgSpeed', 'maxSpeed', 'elevation', 'surface'],
  senderismo: ['distance', 'avgSpeed', 'maxSpeed', 'elevation', 'surface'],
  ciclismo: ['distance', 'avgSpeed', 'maxSpeed', 'elevation', 'surface'],
  trail: ['distance', 'avgSpeed', 'maxSpeed', 'elevation', 'surface'],
  padel: ['modality', 'sets', 'result'],
  tenis: ['modality', 'sets', 'result'],
  badminton: ['modality', 'sets', 'result'],
  squash: ['modality', 'sets', 'result'],
  natacion: ['distance', 'avgSpeed'],
  zumba: [],
  clase_dirigida: [],
  boxeo: [],
  deporte_equipo: [],
  personalizado: ['distance', 'avgSpeed', 'maxSpeed', ...INCLINE_FIELDS, 'elevation', 'surface', 'modality', 'sets', 'result'],
}

export function hasField(type: ActivityType, field: CardioField): boolean {
  return ACTIVITY_FIELDS[type].includes(field)
}

export function showDistance(type: ActivityType): boolean {
  return hasField(type, 'distance')
}

export function showPace(type: ActivityType): boolean {
  // pace is shown for running/walking/hiking/trail when distance exists
  return ['correr_aire', 'caminar_aire', 'senderismo', 'trail', 'cinta_correr', 'cinta_andar', 'cinta_inclinada'].includes(type)
}

export interface CardioSession {
  id: string
  userId: string
  activityType: ActivityType
  customName?: string
  date: string
  startTime?: string
  durationMin: number
  intensity: CardioIntensity
  rpe?: number
  distanceKm?: number
  avgSpeedKmh?: number
  maxSpeedKmh?: number
  avgInclinePct?: number
  maxInclinePct?: number
  runMin?: number
  walkMin?: number
  warmupMin?: number
  cooldownMin?: number
  resistance?: number
  cadenceRpm?: number
  elevationGainM?: number
  surface?: string
  modality?: CardioModality
  sets?: number
  result?: string
  calories?: number
  caloriesSource?: CaloriesSource
  hrAvg?: number
  hrMax?: number
  notes?: string
  createdAt: string
  updatedAt: string
}

export function activityDisplayName(s: CardioSession): string {
  if (s.activityType === 'personalizado' && s.customName) return s.customName
  return ACTIVITY_LABELS[s.activityType]
}

export function activityIcon(s: CardioSession): string {
  // Returns a lucide icon name hint; components map to actual icons
  const map: Record<ActivityType, string> = {
    cinta_correr: 'Activity',
    cinta_andar: 'Footprints',
    cinta_inclinada: 'TrendingUp',
    bici_estatica: 'Bike',
    spinning: 'Bike',
    eliptica: 'Activity',
    escaladora: 'ArrowUp',
    remo: 'Waves',
    correr_aire: 'Footprints',
    caminar_aire: 'Footprints',
    senderismo: 'Mountain',
    ciclismo: 'Bike',
    trail: 'Mountain',
    padel: 'CircleDot',
    tenis: 'CircleDot',
    badminton: 'CircleDot',
    squash: 'CircleDot',
    natacion: 'Waves',
    zumba: 'Music',
    clase_dirigida: 'Users',
    boxeo: 'Swords',
    deporte_equipo: 'Users',
    personalizado: 'Sparkles',
  }
  return map[s.activityType]
}