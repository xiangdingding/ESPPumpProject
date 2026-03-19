// ==================== 类型定义 ====================

// 基于井ID的确定性哈希，保证每次渲染结果一致
function hashWellId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h + id.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

/**
 * 为任意井分配工况和状态（确定性），适用于数据库井列表。
 * 分布比例（449 口井为例，适合原型演示）：
 *   正常 C06  ~50%  ≈225   status=normal
 *   --- 预警 ~25% ---
 *   供液不足 C05 ~8%  ≈36   status=warning
 *   气体影响 C01 ~5%  ≈22   status=warning
 *   叶轮磨损 C04 ~4%  ≈18   status=warning
 *   稠油乳化 C03 ~4%  ≈18   status=warning
 *   出砂 C10     ~2%  ≈9    status=warning
 *   管柱漏失 C12 ~2%  ≈9    status=warning
 *   --- 报警 ~15% ---
 *   气锁 C02     ~5%  ≈22   status=alarm
 *   泵内堵塞 C07 ~4%  ≈18   status=alarm
 *   泵入口堵 C08 ~3%  ≈14   status=alarm
 *   泵反转 C09   ~3%  ≈14   status=alarm
 *   --- 离线 ~10% ---
 *   轴断 C11     ~10% ≈45   status=offline
 */
export function assignWellStatus(wellId: string): { workConditionCode: string; status: 'normal' | 'warning' | 'alarm' | 'offline' } {
  const h = hashWellId(wellId) % 100
  if (h < 50) return { workConditionCode: 'C06', status: 'normal' }
  if (h < 58) return { workConditionCode: 'C05', status: 'warning' }
  if (h < 63) return { workConditionCode: 'C01', status: 'warning' }
  if (h < 67) return { workConditionCode: 'C04', status: 'warning' }
  if (h < 71) return { workConditionCode: 'C03', status: 'warning' }
  if (h < 73) return { workConditionCode: 'C10', status: 'warning' }
  if (h < 75) return { workConditionCode: 'C12', status: 'warning' }
  if (h < 80) return { workConditionCode: 'C02', status: 'alarm' }
  if (h < 84) return { workConditionCode: 'C07', status: 'alarm' }
  if (h < 87) return { workConditionCode: 'C08', status: 'alarm' }
  if (h < 90) return { workConditionCode: 'C09', status: 'alarm' }
  return { workConditionCode: 'C11', status: 'offline' }
}

/**
 * 根据工况和状态生成合理的运行参数
 */
export function generateWellParams(wellId: string, status: string, code: string) {
  const h = hashWellId(wellId)
  const r = (min: number, max: number) => min + (h % 1000) / 1000 * (max - min)

  if (status === 'offline') {
    return { dailyLiquid: 0, dailyOil: 0, waterCut: 0, frequency: 0, current: 0, voltage: 0, power: 0, temperature: 0, vibration: 0, efficiency: 0, submergence: 0, gasOilRatio: 0, dynamicLevel: 0 }
  }
  if (status === 'alarm') {
    return {
      dailyLiquid: Math.round(r(5, 25) * 10) / 10,
      dailyOil: Math.round(r(0.5, 5) * 10) / 10,
      waterCut: Math.round(r(78, 92) * 10) / 10,
      frequency: Math.round(r(45, 50)),
      current: Math.round(r(32, 42) * 10) / 10,
      voltage: Math.round(r(1200, 1400)),
      power: Math.round(r(25, 35)),
      temperature: Math.round(r(98, 115)),
      vibration: Math.round(r(5.5, 9) * 10) / 10,
      efficiency: Math.round(r(12, 25) * 10) / 10,
      submergence: Math.round(r(80, 180)),
      gasOilRatio: Math.round(r(55, 85)),
      dynamicLevel: Math.round(r(2100, 2600)),
    }
  }
  if (status === 'warning') {
    return {
      dailyLiquid: Math.round(r(22, 42) * 10) / 10,
      dailyOil: Math.round(r(4, 12) * 10) / 10,
      waterCut: Math.round(r(70, 85) * 10) / 10,
      frequency: Math.round(r(40, 50)),
      current: Math.round(r(28, 38) * 10) / 10,
      voltage: Math.round(r(1100, 1350)),
      power: Math.round(r(20, 30)),
      temperature: Math.round(r(88, 100)),
      vibration: Math.round(r(3.5, 5.5) * 10) / 10,
      efficiency: Math.round(r(25, 38) * 10) / 10,
      submergence: Math.round(r(150, 300)),
      gasOilRatio: Math.round(r(45, 65)),
      dynamicLevel: Math.round(r(1700, 2200)),
    }
  }
  return {
    dailyLiquid: Math.round(r(35, 80) * 10) / 10,
    dailyOil: Math.round(r(10, 30) * 10) / 10,
    waterCut: Math.round(r(55, 75) * 10) / 10,
    frequency: Math.round(r(30, 45)),
    current: Math.round(r(18, 30) * 10) / 10,
    voltage: Math.round(r(950, 1250)),
    power: Math.round(r(12, 25)),
    temperature: Math.round(r(65, 88)),
    vibration: Math.round(r(1.0, 3.5) * 10) / 10,
    efficiency: Math.round(r(38, 58) * 10) / 10,
    submergence: Math.round(r(300, 550)),
    gasOilRatio: Math.round(r(25, 50)),
    dynamicLevel: Math.round(r(1100, 1800)),
  }
}

// 一级工况（严重）：气锁、泵内堵塞、泵入口堵、泵反转、出砂、轴断、管柱漏失
export const LEVEL1_CONDITION_CODES = ['C02', 'C07', 'C08', 'C09', 'C10', 'C11', 'C12'] as const
export const LEVEL1_CONDITION_NAMES: Record<string, string> = {
  C02: '气锁', C07: '泵内堵塞', C08: '泵入口堵', C09: '泵反转',
  C10: '出砂', C11: '轴断', C12: '管柱漏失',
}
// 二级工况：正常运行、气体影响、稠油及乳化、叶轮磨损、供液不足
export const LEVEL2_CONDITION_CODES = ['C06', 'C01', 'C03', 'C04', 'C05'] as const
export const LEVEL2_CONDITION_NAMES: Record<string, string> = {
  C06: '正常运行', C01: '气体影响', C03: '稠油及乳化', C04: '叶轮磨损', C05: '供液不足',
}

export type WorkConditionCode = string | typeof LEVEL1_CONDITION_CODES[number] | typeof LEVEL2_CONDITION_CODES[number]

export interface WellInfo {
  id: string
  name: string
  oilField: string
  block: string
  lng: number              // 经度
  lat: number              // 纬度
  workConditionCode: WorkConditionCode  // 当前工况编码
  status: 'normal' | 'warning' | 'alarm' | 'offline'
  depth: number            // 井深 m
  pumpDepth: number        // 泵挂深度 m
  casingPressure: number   // 套压 MPa
  tubingPressure: number   // 油压 MPa
  dailyLiquid: number      // 日产液 t/d
  dailyOil: number         // 日产油 t/d
  waterCut: number         // 含水率 %
  frequency: number        // 运行频率 Hz
  current: number          // 电流 A
  voltage: number          // 电压 V
  power: number            // 功率 kW
  temperature: number      // 电机温度 ℃
  vibration: number        // 振动 mm/s
  efficiency: number       // 泵效 %
  runDays: number          // 运行天数
  lastMaintenance: string
  submergence: number      // 沉没度 m
  gasOilRatio: number      // 气油比 m³/t
  dynamicLevel: number     // 动液面 m
  pumpModel: string        // 泵型号
  motorPower: number       // 电机功率 kW
  stages: number           // 泵级数
  cableSpec: string        // 电缆规格
  separatorType: string    // 分离器类型
  pumpType?: 'ESP' // 泵型（可选，兼容）
}

export interface DiagnosisRecord {
  id: string
  wellId: string
  wellName: string
  time: string
  type: string
  status: 'normal' | 'warning' | 'alarm'
  description: string
  parameters: Record<string, number>
  diagnosisMethod: string
}

export interface ProductionRecord {
  date: string
  wellId: string
  wellName: string
  liquidVolume: number
  oilVolume: number
  waterVolume: number
  gasVolume: number
  waterCut: number
  pumpEfficiency: number
}

export interface NineZoneData {
  zone: number
  zoneName: string
  wellCount: number
  percentage: number
  color: string
  suggestion: string
  wells: string[]
}

export interface DynagraphPoint {
  displacement: number
  load: number
}

export interface DynagraphData {
  wellId: string
  wellName: string
  time: string
  surfaceCard: DynagraphPoint[]
  pumpCard: DynagraphPoint[]
  workCondition: string
  workConditionCode: string
  maxLoad: number
  minLoad: number
  pumpEfficiency: number
  liquidProduction: number
}

export interface WorkConditionType {
  code: string
  name: string
  category: 'normal' | 'supply' | 'gas' | 'pump' | 'rod' | 'other'
  mechanism: string
  features: string[]
  suggestions: string[]
  severity: 'info' | 'warning' | 'danger'
  wellCount: number
}

export interface PumpModel {
  id: string
  series: string
  model: string
  manufacturer: string
  ratedDisplacement: number  // m³/d
  ratedHead: number          // m
  ratedPower: number         // kW
  ratedEfficiency: number    // %
  stages: number
  outerDiameter: number      // mm
  maxTemperature: number     // ℃
  maxGasContent: number      // %
  maxSandContent: number     // %
  minSubmergence: number     // m
  applicableDepth: [number, number]
  applicableProduction: [number, number]
  performanceCurve: { flow: number; head: number; efficiency: number; power: number }[]
  price: number
  mtbf: number               // 平均无故障时间 天
}

export interface OptimizationScheme {
  id: string
  wellId: string
  wellName: string
  createTime: string
  status: 'draft' | 'approved' | 'executing' | 'completed' | 'cancelled'
  type: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  currentParams: Record<string, number | string>
  suggestedParams: Record<string, number | string>
  expectedResults: { metric: string; before: number; after: number; unit: string; improvement: string }[]
  steps: { title: string; description: string; duration: string }[]
  costEstimate: number
  benefitEstimate: number
  reason: string
  riskAssessment: string
}

export interface DesignScheme {
  id: string
  name: string
  createTime: string
  wellDepth: number
  targetProduction: number
  targetHead: number
  selectedPump: string
  designParams: Record<string, number | string>
  status: 'designing' | 'reviewed' | 'approved' | 'implemented'
  designer: string
  score: number
}

// ==================== ESP 井列表（15口井，全部电潜泵）====================

export const wellList: WellInfo[] = [
  { id: 'W001', name: 'CQ-A001', oilField: '长庆油田', block: '安塞区', lng: 109.32, lat: 36.88, workConditionCode: 'C06', pumpType: 'ESP', status: 'normal', depth: 2850, pumpDepth: 2200, casingPressure: 3.2, tubingPressure: 1.8, dailyLiquid: 45.6, dailyOil: 12.3, waterCut: 73.0, frequency: 42, current: 28.5, voltage: 1200, power: 22, temperature: 85, vibration: 2.1, efficiency: 42.5, runDays: 365, lastMaintenance: '2025-08-15', submergence: 350, gasOilRatio: 45, dynamicLevel: 1850, pumpModel: 'TD500-200', motorPower: 45, stages: 200, cableSpec: '3×16mm²', separatorType: '旋转气体分离器' },
  { id: 'W002', name: 'CQ-A002', oilField: '长庆油田', block: '安塞区', lng: 109.28, lat: 36.92, workConditionCode: 'C05', pumpType: 'ESP', status: 'warning', depth: 3100, pumpDepth: 2450, casingPressure: 2.8, tubingPressure: 2.1, dailyLiquid: 38.2, dailyOil: 8.7, waterCut: 77.2, frequency: 45, current: 32.1, voltage: 1250, power: 25, temperature: 92, vibration: 4.5, efficiency: 35.8, runDays: 210, lastMaintenance: '2025-12-01', submergence: 280, gasOilRatio: 52, dynamicLevel: 2170, pumpModel: 'TD500-200', motorPower: 45, stages: 220, cableSpec: '3×16mm²', separatorType: '旋转气体分离器' },
  { id: 'W003', name: 'CQ-B001', oilField: '长庆油田', block: '靖边区', lng: 108.95, lat: 37.12, workConditionCode: 'C06', pumpType: 'ESP', status: 'normal', depth: 2600, pumpDepth: 2000, casingPressure: 4.1, tubingPressure: 2.5, dailyLiquid: 52.3, dailyOil: 18.9, waterCut: 63.9, frequency: 38, current: 22.3, voltage: 1100, power: 18, temperature: 78, vibration: 1.8, efficiency: 48.2, runDays: 520, lastMaintenance: '2025-05-20', submergence: 420, gasOilRatio: 38, dynamicLevel: 1580, pumpModel: 'QYB300-180', motorPower: 22, stages: 180, cableSpec: '3×10mm²', separatorType: '重力式分离器' },
  { id: 'W004', name: 'DQ-C001', oilField: '大庆油田', block: '萨尔图区', lng: 125.12, lat: 46.58, workConditionCode: 'C02', pumpType: 'ESP', status: 'alarm', depth: 3200, pumpDepth: 2600, casingPressure: 1.5, tubingPressure: 0.8, dailyLiquid: 22.1, dailyOil: 3.2, waterCut: 85.5, frequency: 50, current: 38.7, voltage: 1350, power: 30, temperature: 105, vibration: 7.2, efficiency: 22.1, runDays: 45, lastMaintenance: '2026-01-15', submergence: 150, gasOilRatio: 68, dynamicLevel: 2450, pumpModel: 'TD800-250', motorPower: 75, stages: 250, cableSpec: '3×25mm²', separatorType: '旋转气体分离器' },
  { id: 'W005', name: 'DQ-C002', oilField: '大庆油田', block: '萨尔图区', lng: 125.08, lat: 46.62, workConditionCode: 'C06', pumpType: 'ESP', status: 'normal', depth: 2400, pumpDepth: 1800, casingPressure: 3.8, tubingPressure: 2.2, dailyLiquid: 65.8, dailyOil: 22.5, waterCut: 65.8, frequency: 35, current: 20.1, voltage: 1050, power: 15, temperature: 72, vibration: 1.5, efficiency: 52.3, runDays: 680, lastMaintenance: '2025-03-10', submergence: 480, gasOilRatio: 32, dynamicLevel: 1320, pumpModel: 'QYB300-180', motorPower: 22, stages: 190, cableSpec: '3×10mm²', separatorType: '重力式分离器' },
  { id: 'W006', name: 'SL-D001', oilField: '胜利油田', block: '东营区', lng: 118.48, lat: 37.42, workConditionCode: 'C04', pumpType: 'ESP', status: 'warning', depth: 2950, pumpDepth: 2350, casingPressure: 2.5, tubingPressure: 1.5, dailyLiquid: 35.4, dailyOil: 7.8, waterCut: 78.0, frequency: 48, current: 35.2, voltage: 1300, power: 28, temperature: 95, vibration: 5.1, efficiency: 30.5, runDays: 150, lastMaintenance: '2025-10-05', submergence: 220, gasOilRatio: 58, dynamicLevel: 2130, pumpModel: 'TD500-200', motorPower: 45, stages: 210, cableSpec: '3×16mm²', separatorType: '旋转气体分离器' },
  { id: 'W007', name: 'SL-D002', oilField: '胜利油田', block: '东营区', lng: 118.52, lat: 37.38, workConditionCode: 'C06', pumpType: 'ESP', status: 'normal', depth: 2750, pumpDepth: 2150, casingPressure: 3.5, tubingPressure: 2.0, dailyLiquid: 48.9, dailyOil: 15.6, waterCut: 68.1, frequency: 40, current: 26.8, voltage: 1180, power: 20, temperature: 82, vibration: 2.3, efficiency: 45.1, runDays: 430, lastMaintenance: '2025-07-22', submergence: 380, gasOilRatio: 42, dynamicLevel: 1770, pumpModel: 'TD500-200', motorPower: 45, stages: 200, cableSpec: '3×16mm²', separatorType: '重力式分离器' },
  { id: 'W008', name: 'XJ-E001', oilField: '新疆油田', block: '克拉玛依区', lng: 84.88, lat: 45.58, workConditionCode: 'C06', pumpType: 'ESP', status: 'normal', depth: 2200, pumpDepth: 1650, casingPressure: 4.5, tubingPressure: 2.8, dailyLiquid: 72.1, dailyOil: 28.4, waterCut: 60.6, frequency: 32, current: 18.5, voltage: 980, power: 12, temperature: 68, vibration: 1.2, efficiency: 55.8, runDays: 820, lastMaintenance: '2025-01-18', submergence: 520, gasOilRatio: 28, dynamicLevel: 1130, pumpModel: 'QYB300-180', motorPower: 22, stages: 160, cableSpec: '3×10mm²', separatorType: '重力式分离器' },
  { id: 'W009', name: 'XJ-E002', oilField: '新疆油田', block: '克拉玛依区', lng: 84.92, lat: 45.62, workConditionCode: 'C11', pumpType: 'ESP', status: 'offline', depth: 3050, pumpDepth: 2500, casingPressure: 0, tubingPressure: 0, dailyLiquid: 0, dailyOil: 0, waterCut: 0, frequency: 0, current: 0, voltage: 0, power: 0, temperature: 0, vibration: 0, efficiency: 0, runDays: 0, lastMaintenance: '2026-02-20', submergence: 0, gasOilRatio: 0, dynamicLevel: 0, pumpModel: 'TD800-250', motorPower: 75, stages: 260, cableSpec: '3×25mm²', separatorType: '旋转气体分离器' },
  { id: 'W010', name: 'YC-F001', oilField: '延长油田', block: '延安区', lng: 109.52, lat: 36.62, workConditionCode: 'C06', pumpType: 'ESP', status: 'normal', depth: 2680, pumpDepth: 2080, casingPressure: 3.0, tubingPressure: 1.7, dailyLiquid: 42.3, dailyOil: 11.2, waterCut: 73.5, frequency: 43, current: 27.5, voltage: 1150, power: 21, temperature: 83, vibration: 2.0, efficiency: 41.2, runDays: 290, lastMaintenance: '2025-09-12', submergence: 340, gasOilRatio: 46, dynamicLevel: 1740, pumpModel: 'TD500-200', motorPower: 45, stages: 195, cableSpec: '3×16mm²', separatorType: '旋转气体分离器' },
  { id: 'W011', name: 'YC-F002', oilField: '延长油田', block: '延安区', lng: 109.48, lat: 36.58, workConditionCode: 'C05', pumpType: 'ESP', status: 'warning', depth: 2500, pumpDepth: 1900, casingPressure: 2.2, tubingPressure: 1.3, dailyLiquid: 30.5, dailyOil: 5.8, waterCut: 81.0, frequency: 50, current: 33.8, voltage: 1280, power: 26, temperature: 98, vibration: 4.8, efficiency: 28.5, runDays: 95, lastMaintenance: '2025-11-28', submergence: 200, gasOilRatio: 62, dynamicLevel: 1700, pumpModel: 'TD500-200', motorPower: 45, stages: 215, cableSpec: '3×16mm²', separatorType: '旋转气体分离器' },
  { id: 'W012', name: 'CQ-A003', oilField: '长庆油田', block: '安塞区', lng: 109.35, lat: 36.85, workConditionCode: 'C06', pumpType: 'ESP', status: 'normal', depth: 2900, pumpDepth: 2280, casingPressure: 3.6, tubingPressure: 2.0, dailyLiquid: 50.2, dailyOil: 16.8, waterCut: 66.5, frequency: 41, current: 25.9, voltage: 1170, power: 19, temperature: 80, vibration: 1.9, efficiency: 46.8, runDays: 480, lastMaintenance: '2025-06-08', submergence: 400, gasOilRatio: 40, dynamicLevel: 1880, pumpModel: 'TD500-200', motorPower: 45, stages: 205, cableSpec: '3×16mm²', separatorType: '重力式分离器' },
  { id: 'W013', name: 'SL-D003', oilField: '胜利油田', block: '滨海区', lng: 118.65, lat: 37.52, workConditionCode: 'C06', pumpType: 'ESP', status: 'normal', depth: 3100, pumpDepth: 2500, casingPressure: 3.3, tubingPressure: 1.9, dailyLiquid: 55.0, dailyOil: 14.3, waterCut: 74.0, frequency: 44, current: 29.2, voltage: 1220, power: 24, temperature: 86, vibration: 2.2, efficiency: 43.5, runDays: 310, lastMaintenance: '2025-08-30', submergence: 360, gasOilRatio: 44, dynamicLevel: 2140, pumpModel: 'TD800-250', motorPower: 75, stages: 240, cableSpec: '3×25mm²', separatorType: '旋转气体分离器' },
  { id: 'W014', name: 'DQ-C003', oilField: '大庆油田', block: '让胡路区', lng: 124.85, lat: 46.65, workConditionCode: 'C07', pumpType: 'ESP', status: 'alarm', depth: 2800, pumpDepth: 2200, casingPressure: 1.8, tubingPressure: 1.0, dailyLiquid: 18.5, dailyOil: 2.5, waterCut: 86.5, frequency: 48, current: 36.5, voltage: 1320, power: 29, temperature: 102, vibration: 6.8, efficiency: 20.5, runDays: 60, lastMaintenance: '2026-01-02', submergence: 160, gasOilRatio: 72, dynamicLevel: 2040, pumpModel: 'TD500-200', motorPower: 45, stages: 210, cableSpec: '3×16mm²', separatorType: '旋转气体分离器' },
  { id: 'W015', name: 'XJ-E003', oilField: '新疆油田', block: '百口泉区', lng: 85.42, lat: 46.08, workConditionCode: 'C06', pumpType: 'ESP', status: 'normal', depth: 2350, pumpDepth: 1750, casingPressure: 4.2, tubingPressure: 2.6, dailyLiquid: 68.0, dailyOil: 25.0, waterCut: 63.2, frequency: 36, current: 19.8, voltage: 1020, power: 14, temperature: 70, vibration: 1.3, efficiency: 54.0, runDays: 550, lastMaintenance: '2025-04-15', submergence: 460, gasOilRatio: 30, dynamicLevel: 1290, pumpModel: 'QYB300-180', motorPower: 22, stages: 170, cableSpec: '3×10mm²', separatorType: '重力式分离器' },
]

// ==================== 时序数据生成 ====================

export const generateTimeSeriesData = (hours: number = 24) => {
  const data: { time: string; value: number; baseline: number }[] = []
  const now = new Date()
  for (let i = hours; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 3600000)
    const base = 30 + Math.sin(i / 4) * 5
    data.push({
      time: `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`,
      value: base + (Math.random() - 0.5) * 4,
      baseline: base,
    })
  }
  return data
}

export const generateCurrentSignalData = (points: number = 500) => {
  const data: { index: number; value: number }[] = []
  for (let i = 0; i < points; i++) {
    const t = i / points * 2 * Math.PI
    data.push({ index: i, value: 30 * Math.sin(t) + 5 * Math.sin(2 * t + 0.3) + 2 * Math.sin(3 * t + 0.7) + (Math.random() - 0.5) * 3 })
  }
  return data
}

// ==================== 电参数曲线数据生成 ====================

const generateNormalCard = (sl: number): DynagraphPoint[] => {
  const pts: DynagraphPoint[] = []
  for (let i = 0; i <= 100; i++) {
    let d: number, l: number
    if (i <= 25) { d = (i / 25) * sl; l = 30 + (i / 25) * 40 + Math.random() * 2 }
    else if (i <= 50) { d = sl - ((i - 25) / 25) * sl * 0.05; l = 70 - ((i - 25) / 25) * 5 + Math.random() * 2 }
    else if (i <= 75) { d = sl * 0.95 - ((i - 50) / 25) * sl * 0.9; l = 65 - ((i - 50) / 25) * 35 + Math.random() * 2 }
    else { d = sl * 0.05 + ((i - 75) / 25) * sl * 0.05 * (1 - (i - 75) / 25); l = 30 + Math.random() * 2 }
    pts.push({ displacement: Math.round(d * 100) / 100, load: Math.round(l * 10) / 10 })
  }
  return pts
}

const generateSupplyInsuffCard = (sl: number): DynagraphPoint[] => {
  const pts: DynagraphPoint[] = []
  for (let i = 0; i <= 100; i++) {
    let d: number, l: number
    if (i <= 25) { d = (i / 25) * sl; l = 30 + (i / 25) * 40 + Math.random() * 2 }
    else if (i <= 40) { d = sl - ((i - 25) / 15) * sl * 0.03; l = 70 - ((i - 25) / 15) * 30 + Math.random() * 2 }
    else if (i <= 75) { d = sl * 0.97 - ((i - 40) / 35) * sl * 0.92; l = 40 - ((i - 40) / 35) * 10 + Math.random() * 2 }
    else { d = sl * 0.05 + ((i - 75) / 25) * sl * 0.02; l = 30 + Math.random() * 2 }
    pts.push({ displacement: Math.round(d * 100) / 100, load: Math.round(l * 10) / 10 })
  }
  return pts
}

const generateGasLockCard = (sl: number): DynagraphPoint[] => {
  const pts: DynagraphPoint[] = []
  for (let i = 0; i <= 100; i++) {
    let d: number, l: number
    if (i <= 30) { d = (i / 30) * sl; l = 35 + (i / 30) * 20 + Math.sin(i / 5) * 5 + Math.random() * 2 }
    else if (i <= 50) { d = sl - ((i - 30) / 20) * sl * 0.04; l = 55 - ((i - 30) / 20) * 15 + Math.sin(i / 3) * 3 + Math.random() * 2 }
    else if (i <= 80) { d = sl * 0.96 - ((i - 50) / 30) * sl * 0.91; l = 40 - ((i - 50) / 30) * 5 + Math.sin(i / 4) * 4 + Math.random() * 2 }
    else { d = sl * 0.05 + ((i - 80) / 20) * sl * 0.01; l = 35 + Math.sin(i / 3) * 3 + Math.random() * 2 }
    pts.push({ displacement: Math.round(d * 100) / 100, load: Math.round(l * 10) / 10 })
  }
  return pts
}

const generatePumpLeakCard = (sl: number): DynagraphPoint[] => {
  const pts: DynagraphPoint[] = []
  for (let i = 0; i <= 100; i++) {
    let d: number, l: number
    if (i <= 25) { d = (i / 25) * sl; l = 32 + (i / 25) * 25 + Math.random() * 3 }
    else if (i <= 50) { d = sl - ((i - 25) / 25) * sl * 0.06; l = 57 - ((i - 25) / 25) * 15 + Math.random() * 3 }
    else if (i <= 75) { d = sl * 0.94 - ((i - 50) / 25) * sl * 0.89; l = 42 - ((i - 50) / 25) * 10 + Math.random() * 3 }
    else { d = sl * 0.05 + ((i - 75) / 25) * sl * 0.02; l = 32 + Math.random() * 3 }
    pts.push({ displacement: Math.round(d * 100) / 100, load: Math.round(l * 10) / 10 })
  }
  return pts
}

type CardGen = (s: number) => DynagraphPoint[]
const cardGens: Record<string, CardGen> = { C06: generateNormalCard, C05: generateSupplyInsuffCard, C01: generateGasLockCard, C02: generateGasLockCard, C04: generatePumpLeakCard }

const workConditionNameMap: Record<string, string> = { C01: '气体影响', C02: '气锁', C03: '稠油及乳化', C04: '叶轮磨损', C05: '供液不足', C06: '正常', C07: '泵内堵塞', C08: '泵入口堵', C09: '泵反转', C10: '出砂', C11: '轴断', C12: '管柱漏失' }
export const generateDynagraphData = (wellId: string): DynagraphData => {
  const well = wellList.find(w => w.id === wellId)
  if (!well) return { wellId, wellName: '', time: '', surfaceCard: [], pumpCard: [], workCondition: '未知', workConditionCode: 'unknown', maxLoad: 0, minLoad: 0, pumpEfficiency: 0, liquidProduction: 0 }
  const code = well.workConditionCode
  const name = workConditionNameMap[code] || '正常'
  const sl = 3.0 + Math.random() * 1.5
  const gen = cardGens[code] || generateNormalCard
  const sc = gen(sl)
  const pc = sc.map(p => ({ displacement: p.displacement * 0.92 + Math.random() * 0.05, load: p.load * 0.85 + Math.random() * 3 }))
  const loads = sc.map(p => p.load)
  return { wellId, wellName: well.name, time: new Date().toISOString().replace('T', ' ').substring(0, 19), surfaceCard: sc, pumpCard: pc, workCondition: name, workConditionCode: code, maxLoad: Math.round(Math.max(...loads) * 10) / 10, minLoad: Math.round(Math.min(...loads) * 10) / 10, pumpEfficiency: well.efficiency, liquidProduction: well.dailyLiquid }
}

// ==================== 工况类型库 ====================

export const workConditionTypes: WorkConditionType[] = [
  // ---- 正常 ----
  {
    code: 'C06', name: '正常', category: 'normal', severity: 'info', wellCount: 5,
    mechanism: '泵工作正常，各级叶轮运转平稳，扬程排量匹配良好。电流稳定无波动，振动值在正常范围，各参数在合理区间内波动。',
    features: [
      '电流稳定，波动<5%',
      '充满系数>0.85',
      '产液量稳定，日波动<5%',
      '电流平稳，无异常波动',
      '泵效>40%，运行参数均在正常区间',
    ],
    suggestions: [
      '维持当前运行参数，定期巡检',
      '按周期执行预防性保养',
      '持续监测关键参数趋势',
      '根据产量递减适时微调频率',
    ],
  },
  // ---- 一级工况（严重） ----
  {
    code: 'C02', name: '气锁', category: 'gas', severity: 'danger', wellCount: 1,
    mechanism: '大量游离气充满泵腔，叶轮在气体中空转，无法建立有效扬程。泵完全丧失排液能力，电流骤降至空载值，产量归零。',
    features: [
      '电流骤降至空载值，波动剧烈',
      '充满系数<0.15',
      '产液量骤降至近零',
      '电流明显降低且波形异常平坦',
    ],
    suggestions: [
      '立即停机，开套管放气降低气液比',
      '安装或升级高效气体分离器',
      '大幅增大沉没度（加深泵挂）',
      '降低运行频率，减少气液比',
    ],
  },
  {
    code: 'C07', name: '泵内堵塞', category: 'pump', severity: 'danger', wellCount: 1,
    mechanism: '结蜡、结垢或地层碎屑在叶轮/导轮流道内堆积，导致流道截面缩小或完全堵塞。泵排量急剧下降，电流异常升高，振动增大。',
    features: [
      '电流异常升高，振动频谱出现堵塞特征',
      '产液量骤降>50%',
      '电流升高，功率增大',
      '泵效降至<20%',
      '井口油压升高或出液困难',
    ],
    suggestions: [
      '热洗井或化学清洗（溶蜡/溶垢剂）',
      '起泵检修，清理叶轮与导轮',
      '加注防蜡/防垢缓蚀剂',
      '优化生产参数，避免低于结蜡温度运行',
    ],
  },
  {
    code: 'C08', name: '泵入口堵', category: 'pump', severity: 'danger', wellCount: 1,
    mechanism: '泵入口处（筛管/滤网/尾管）被砂粒、垢片或异物堵塞，液体无法进入泵腔。表现类似供液不足但动液面不降，电流持续偏低且产量骤降。',
    features: [
      '电流持续偏低，泵入口压力骤降',
      '产液量骤降，但动液面不明显下降',
      '套压正常或偏高',
      '与供液不足的关键区别：动液面未持续下降',
    ],
    suggestions: [
      '反洗井冲洗入口堵塞物',
      '起泵检查并清理入口筛管/滤网',
      '加装合理目数的防砂筛管',
      '优化注水方案，控制地层出砂',
    ],
  },
  {
    code: 'C09', name: '泵反转', category: 'pump', severity: 'danger', wellCount: 0,
    mechanism: '电机相序接反或变频器输出相序错误，导致ESP泵叶轮反向旋转。反转时泵不产生正向扬程，液体无法被举升，电流偏低且产量为零。',
    features: [
      '启泵后无产液，扬程为零',
      '电流明显低于正常值（约正常的40~60%）',
      '电机转向与设计方向相反',
      '井口无压力建立或压力异常低',
      '功率极低，振动可能偏大',
    ],
    suggestions: [
      '立即停机，调换任意两相电缆接线',
      '检查变频器相序设置并纠正',
      '确认电机旋转方向后再启泵',
      '安装相序保护器防止再次误接',
    ],
  },
  {
    code: 'C10', name: '出砂', category: 'other', severity: 'warning', wellCount: 2,
    mechanism: '地层出砂导致井液含砂浓度超标，砂粒冲蚀泵叶轮/导轮并在泵腔沉积。电流波动增大，振动频谱异常，严重时可导致砂卡/砂埋。',
    features: [
      '振动频谱出现异常谐波分量',
      '电流波动增大或逐步升高',
      '振动值异常增大',
      '井口取样含砂量>0.05%',
      '泵效加速下降，伴随异常噪音',
    ],
    suggestions: [
      '加装井下除砂器或旋流除砂装置',
      '选用耐磨泵级（碳化钨/陶瓷涂层）',
      '实施化学固砂或机械防砂（砾石充填）',
      '控制生产压差，避免过度抽汲导致出砂加剧',
    ],
  },
  {
    code: 'C11', name: '轴断', category: 'rod', severity: 'danger', wellCount: 0,
    mechanism: 'ESP泵轴或传动轴因疲劳、腐蚀或过载发生断裂，电机与泵失去机械连接。电流骤降至空载值，产量瞬间归零，振动特征突变。',
    features: [
      '电流突然降至空载值（正常的20~30%）',
      '产量瞬间降至零',
      '电流降至空载值且稳定不变',
      '振动特征突变后趋于平稳',
      '温度可能因空转而升高',
    ],
    suggestions: [
      '立即停机，避免空转烧电机',
      '起出泵组，检查断裂位置和原因',
      '更换整套泵组和传动轴',
      '分析断口形态（疲劳/腐蚀/过载），针对性改进',
    ],
  },
  {
    code: 'C12', name: '管柱漏失', category: 'other', severity: 'warning', wellCount: 1,
    mechanism: '油管连接处丝扣松动、腐蚀穿孔或管体破裂，导致举升液体从漏点回流。泵排量正常但井口产液减少，电参数形态可能正常但产量与泵效不匹配。',
    features: [
      '泵效计算值偏低但电参数接近正常',
      '井口产液量<泵理论排量的70%',
      '套压异常偏高或波动',
      '油管试压不合格',
      '静压恢复测试显示管柱不密封',
    ],
    suggestions: [
      '起管柱逐根试压，定位漏失点',
      '更换腐蚀/损坏油管',
      '采用高抗腐蚀管材（内涂层或合金管）',
      '加注缓蚀剂，延长管柱使用寿命',
    ],
  },
  // ---- 二级工况（预警） ----
  {
    code: 'C01', name: '气体影响', category: 'gas', severity: 'warning', wellCount: 2,
    mechanism: '游离气进入泵腔，导致气液混合抽汲。气体在叶轮中被压缩，有效扬程降低，排液减少。电流波动增大，泵效下降但仍有产液。',
    features: [
      '电流波动增大，呈周期性波动',
      '充满系数0.55~0.80',
      '产液量下降10~35%',
      '电流轻微下降或波动增大',
    ],
    suggestions: [
      '安装旋流式气体分离器',
      '增大沉没度（下调泵挂深度）',
      '降低运行频率以减少进气',
      '校核套管气油比，优化分采方案',
    ],
  },
  {
    code: 'C03', name: '稠油及乳化', category: 'other', severity: 'warning', wellCount: 1,
    mechanism: '原油黏度高或油水形成稳定乳化液，导致抽汲阻力增大。电流持续偏高，功率增大，泵效下降。严重时可造成电机过载或卡泵。',
    features: [
      '电流持续偏高，功率因数异常',
      '产液量缓慢下降，油品含蜡/含胶质高',
      '井口回压升高',
    ],
    suggestions: [
      '井筒加热降黏（电加热杆或热流体循环）',
      '加注破乳剂/降黏剂',
      '降低运行频率，减小抽汲速度',
      '选用耐磨离心泵级',
    ],
  },
  {
    code: 'C04', name: '叶轮磨损', category: 'pump', severity: 'warning', wellCount: 2,
    mechanism: '泵叶轮与导轮因含砂液体冲蚀或长期运转导致间隙增大，泵内漏增加，扬程和排量同步下降。振动频谱中出现叶频谐波异常，泵效持续走低。',
    features: [
      '振动频谱叶频谐波异常，泵效逐月下降',
      '泵效持续下降（月降幅>2%）',
      '额定频率下扬程/排量均不达标',
      '电流可能略有增大',
    ],
    suggestions: [
      '起泵检修，更换磨损叶轮和导轮',
      '加装井下除砂器，降低含砂浓度',
      '选用碳化钨或陶瓷涂层耐磨泵级',
      '优化运行频率，避免偏工况运行',
    ],
  },
  {
    code: 'C05', name: '供液不足', category: 'supply', severity: 'warning', wellCount: 3,
    mechanism: '地层供液能力低于泵排量，动液面持续下降导致沉没度不足。泵入口压力降低，电流波动增大，产液量下降。',
    features: [
      '泵入口压力持续降低，电流波动增大',
      '动液面持续下降，沉没度<200m',
      '产液量波动下降15~50%',
      '间歇出液或气液交替',
    ],
    suggestions: [
      '降低运行频率匹配地层供液',
      '改间歇抽油制度（定时启停）',
      '实施酸化/压裂等增产措施',
      '下调泵挂深度，增大沉没度',
    ],
  },
]

// 动态计算 wellCount：基于 wellDbList 中每口井的 assignWellStatus 结果
;(() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { wellDbList: dbList } = require('./wellDbData')
    if (!dbList || dbList.length === 0) return
    const counts: Record<string, number> = {}
    dbList.forEach((w: { Well_Id: string }) => {
      const { workConditionCode } = assignWellStatus(String(w.Well_Id || ''))
      counts[workConditionCode] = (counts[workConditionCode] || 0) + 1
    })
    workConditionTypes.forEach(wc => {
      if (counts[wc.code] !== undefined) wc.wellCount = counts[wc.code]
    })
  } catch { /* wellDbData 不可用时保持原始值 */ }
})()

// ==================== ESP泵型选型库 ====================

export const pumpModelLibrary: PumpModel[] = [
  { id: 'ESP-001', series: 'TD系列', model: 'TD500-200', manufacturer: '中石油装备', ratedDisplacement: 50, ratedHead: 2000, ratedPower: 45, ratedEfficiency: 52, stages: 200, outerDiameter: 114, maxTemperature: 120, maxGasContent: 30, maxSandContent: 0.05, minSubmergence: 300, applicableDepth: [1500, 3000], applicableProduction: [30, 80], performanceCurve: [{ flow: 20, head: 2400, efficiency: 35, power: 30 }, { flow: 30, head: 2250, efficiency: 42, power: 35 }, { flow: 40, head: 2100, efficiency: 48, power: 40 }, { flow: 50, head: 2000, efficiency: 52, power: 45 }, { flow: 60, head: 1850, efficiency: 50, power: 48 }, { flow: 70, head: 1650, efficiency: 45, power: 50 }, { flow: 80, head: 1400, efficiency: 38, power: 52 }], price: 280000, mtbf: 730 },
  { id: 'ESP-002', series: 'TD系列', model: 'TD800-250', manufacturer: '中石油装备', ratedDisplacement: 80, ratedHead: 2500, ratedPower: 75, ratedEfficiency: 55, stages: 250, outerDiameter: 130, maxTemperature: 130, maxGasContent: 25, maxSandContent: 0.03, minSubmergence: 350, applicableDepth: [2000, 3500], applicableProduction: [50, 120], performanceCurve: [{ flow: 40, head: 3000, efficiency: 38, power: 55 }, { flow: 50, head: 2850, efficiency: 44, power: 60 }, { flow: 60, head: 2700, efficiency: 50, power: 65 }, { flow: 70, head: 2600, efficiency: 53, power: 70 }, { flow: 80, head: 2500, efficiency: 55, power: 75 }, { flow: 90, head: 2350, efficiency: 52, power: 78 }, { flow: 100, head: 2150, efficiency: 47, power: 82 }, { flow: 120, head: 1800, efficiency: 38, power: 88 }], price: 420000, mtbf: 680 },
  { id: 'ESP-003', series: 'QYB系列', model: 'QYB300-180', manufacturer: '海隆石油', ratedDisplacement: 30, ratedHead: 1800, ratedPower: 22, ratedEfficiency: 48, stages: 180, outerDiameter: 102, maxTemperature: 110, maxGasContent: 35, maxSandContent: 0.08, minSubmergence: 250, applicableDepth: [1000, 2500], applicableProduction: [15, 50], performanceCurve: [{ flow: 10, head: 2100, efficiency: 30, power: 14 }, { flow: 15, head: 2000, efficiency: 36, power: 16 }, { flow: 20, head: 1950, efficiency: 42, power: 18 }, { flow: 25, head: 1900, efficiency: 46, power: 20 }, { flow: 30, head: 1800, efficiency: 48, power: 22 }, { flow: 35, head: 1650, efficiency: 44, power: 24 }, { flow: 40, head: 1500, efficiency: 39, power: 26 }, { flow: 50, head: 1200, efficiency: 30, power: 30 }], price: 185000, mtbf: 800 },
  { id: 'ESP-004', series: 'TD系列', model: 'TD1200-300', manufacturer: '中石油装备', ratedDisplacement: 120, ratedHead: 3000, ratedPower: 120, ratedEfficiency: 58, stages: 300, outerDiameter: 143, maxTemperature: 140, maxGasContent: 20, maxSandContent: 0.02, minSubmergence: 400, applicableDepth: [2500, 4000], applicableProduction: [80, 180], performanceCurve: [{ flow: 60, head: 3600, efficiency: 40, power: 85 }, { flow: 80, head: 3400, efficiency: 48, power: 95 }, { flow: 100, head: 3200, efficiency: 54, power: 108 }, { flow: 120, head: 3000, efficiency: 58, power: 120 }, { flow: 140, head: 2750, efficiency: 55, power: 130 }, { flow: 160, head: 2450, efficiency: 48, power: 140 }, { flow: 180, head: 2100, efficiency: 40, power: 150 }], price: 580000, mtbf: 650 },
  { id: 'ESP-005', series: 'QYB系列', model: 'QYB150-120', manufacturer: '海隆石油', ratedDisplacement: 15, ratedHead: 1200, ratedPower: 11, ratedEfficiency: 45, stages: 120, outerDiameter: 89, maxTemperature: 100, maxGasContent: 40, maxSandContent: 0.1, minSubmergence: 200, applicableDepth: [800, 2000], applicableProduction: [8, 25], performanceCurve: [{ flow: 5, head: 1450, efficiency: 28, power: 6 }, { flow: 8, head: 1380, efficiency: 34, power: 7.5 }, { flow: 10, head: 1320, efficiency: 38, power: 8.5 }, { flow: 12, head: 1260, efficiency: 42, power: 9.5 }, { flow: 15, head: 1200, efficiency: 45, power: 11 }, { flow: 18, head: 1100, efficiency: 42, power: 12 }, { flow: 20, head: 1000, efficiency: 38, power: 13 }, { flow: 25, head: 800, efficiency: 30, power: 15 }], price: 120000, mtbf: 850 },
  { id: 'ESP-006', series: 'REDA系列', model: 'DN1750', manufacturer: 'Schlumberger', ratedDisplacement: 100, ratedHead: 2800, ratedPower: 90, ratedEfficiency: 62, stages: 280, outerDiameter: 138, maxTemperature: 150, maxGasContent: 45, maxSandContent: 0.1, minSubmergence: 300, applicableDepth: [2000, 3800], applicableProduction: [60, 150], performanceCurve: [{ flow: 50, head: 3300, efficiency: 42, power: 65 }, { flow: 60, head: 3150, efficiency: 48, power: 72 }, { flow: 70, head: 3050, efficiency: 54, power: 78 }, { flow: 80, head: 2950, efficiency: 58, power: 83 }, { flow: 100, head: 2800, efficiency: 62, power: 90 }, { flow: 120, head: 2550, efficiency: 58, power: 98 }, { flow: 140, head: 2250, efficiency: 50, power: 108 }, { flow: 150, head: 2050, efficiency: 44, power: 115 }], price: 850000, mtbf: 1100 },
]

// ==================== 优化方案库 ====================

export const optimizationSchemes: OptimizationScheme[] = [
  { id: 'OPT-001', wellId: 'W002', wellName: 'CQ-A002', createTime: '2026-02-28 10:00', status: 'approved', type: '频率优化', priority: 'high',
    currentParams: { frequency: 45, current: 32.1, efficiency: 35.8, dailyLiquid: 38.2, power: 25 },
    suggestedParams: { frequency: 38, current: 27, efficiency: 43, dailyLiquid: 35, power: 19 },
    expectedResults: [{ metric: '泵效', before: 35.8, after: 43.0, unit: '%', improvement: '+7.2%' }, { metric: '日耗电', before: 600, after: 456, unit: 'kWh', improvement: '-24%' }, { metric: '日产液', before: 38.2, after: 35.0, unit: 't', improvement: '-8.4%' }, { metric: '系统效率', before: 28, after: 35, unit: '%', improvement: '+25%' }],
    steps: [{ title: '参数确认', description: '确认当前井况参数，核实供液能力', duration: '1天' }, { title: '逐步降频', description: '每次降低2Hz，观察24小时后再调整', duration: '3天' }, { title: '稳定观察', description: '达到目标频率后连续观察7天', duration: '7天' }, { title: '效果评估', description: '对比优化前后各项指标', duration: '1天' }],
    costEstimate: 5000, benefitEstimate: 52000, reason: '当前供液不足，高频运行导致泵效低、能耗高', riskAssessment: '降频可能导致短期产量下降约8%，但泵效和系统效率将显著提升' },
  { id: 'OPT-002', wellId: 'W004', wellName: 'DQ-C001', createTime: '2026-02-27 14:30', status: 'executing', type: '检泵作业', priority: 'urgent',
    currentParams: { efficiency: 22.1, current: 38.7, temperature: 105, vibration: 7.2, dailyLiquid: 22.1 },
    suggestedParams: { efficiency: 48, current: 26, temperature: 82, vibration: 2.0, dailyLiquid: 50 },
    expectedResults: [{ metric: '泵效', before: 22.1, after: 48.0, unit: '%', improvement: '+117%' }, { metric: '日产液', before: 22.1, after: 50.0, unit: 't', improvement: '+126%' }, { metric: '电机温度', before: 105, after: 82, unit: '°C', improvement: '-22%' }, { metric: '振动值', before: 7.2, after: 2.0, unit: 'mm/s', improvement: '-72%' }],
    steps: [{ title: '停机准备', description: '关井、放压、准备作业设备', duration: '0.5天' }, { title: '起泵检查', description: '起出ESP泵组，检查泵体、电机、电缆', duration: '2天' }, { title: '更换部件', description: '更换磨损叶轮、导轮，检修电机', duration: '1天' }, { title: '下泵试运', description: '下入新泵组，试运行并调参', duration: '1天' }, { title: '效果验证', description: '连续运行7天，验证各项指标', duration: '7天' }],
    costEstimate: 180000, benefitEstimate: 450000, reason: '泵效严重偏低，电机过热，振动超标，存在设备损坏风险', riskAssessment: '检泵作业期间停产约4天，但可避免设备烧毁造成更大损失' },
  { id: 'OPT-003', wellId: 'W006', wellName: 'SL-D001', createTime: '2026-02-26 09:15', status: 'draft', type: '频率优化', priority: 'medium',
    currentParams: { frequency: 48, current: 35.2, temperature: 95, efficiency: 30.5, power: 28 },
    suggestedParams: { frequency: 42, current: 30, temperature: 85, efficiency: 38, power: 22 },
    expectedResults: [{ metric: '泵效', before: 30.5, after: 38.0, unit: '%', improvement: '+24.6%' }, { metric: '电机温度', before: 95, after: 85, unit: '°C', improvement: '-10.5%' }, { metric: '振动值', before: 5.1, after: 3.2, unit: 'mm/s', improvement: '-37%' }, { metric: '日耗电', before: 672, after: 528, unit: 'kWh', improvement: '-21.4%' }],
    steps: [{ title: '工况分析', description: '详细分析当前工况和供液能力', duration: '1天' }, { title: '降频调整', description: '分3次降频，每次2Hz', duration: '3天' }, { title: '效果观察', description: '观察温度、振动、产量变化', duration: '7天' }],
    costEstimate: 3000, benefitEstimate: 38000, reason: '电机温度偏高，振动超标，降频可改善运行工况', riskAssessment: '风险较低，降频幅度适中' },
  { id: 'OPT-004', wellId: 'W005', wellName: 'DQ-C002', createTime: '2026-02-25 16:00', status: 'completed', type: '增产提频', priority: 'low',
    currentParams: { frequency: 35, current: 20.1, efficiency: 52.3, dailyLiquid: 65.8, dailyOil: 22.5 },
    suggestedParams: { frequency: 42, current: 24, efficiency: 50, dailyLiquid: 82, dailyOil: 28 },
    expectedResults: [{ metric: '日产液', before: 65.8, after: 82.0, unit: 't', improvement: '+24.6%' }, { metric: '日产油', before: 22.5, after: 28.0, unit: 't', improvement: '+24.4%' }, { metric: '泵效', before: 52.3, after: 50.0, unit: '%', improvement: '-4.4%' }, { metric: '日耗电', before: 360, after: 456, unit: 'kWh', improvement: '+26.7%' }],
    steps: [{ title: '供液评估', description: '确认地层供液能力充足', duration: '1天' }, { title: '逐步提频', description: '每次提高2Hz，观察动液面变化', duration: '4天' }, { title: '稳产观察', description: '达到目标频率后观察产量稳定性', duration: '14天' }],
    costEstimate: 2000, benefitEstimate: 85000, reason: '供液充足，泵效高，有较大增产空间', riskAssessment: '提频后泵效略有下降，但产量增幅显著，经济效益好' },
  { id: 'OPT-005', wellId: 'W008', wellName: 'XJ-E001', createTime: '2026-02-24 11:20', status: 'approved', type: '增产提频', priority: 'low',
    currentParams: { frequency: 32, current: 18.5, efficiency: 55.8, dailyLiquid: 72.1, dailyOil: 28.4 },
    suggestedParams: { frequency: 40, current: 23, efficiency: 52, dailyLiquid: 95, dailyOil: 37 },
    expectedResults: [{ metric: '日产液', before: 72.1, after: 95.0, unit: 't', improvement: '+31.8%' }, { metric: '日产油', before: 28.4, after: 37.0, unit: 't', improvement: '+30.3%' }, { metric: '泵效', before: 55.8, after: 52.0, unit: '%', improvement: '-6.8%' }],
    steps: [{ title: '供液评估', description: '确认供液能力', duration: '1天' }, { title: '逐步提频', description: '分4次提频', duration: '4天' }, { title: '稳产观察', description: '观察14天', duration: '14天' }],
    costEstimate: 2000, benefitEstimate: 120000, reason: '供液充足，增产潜力大', riskAssessment: '风险低' },
  { id: 'OPT-006', wellId: 'W011', wellName: 'YC-F002', createTime: '2026-02-23 08:45', status: 'draft', type: '维护保养', priority: 'high',
    currentParams: { vibration: 4.8, current: 33.8, temperature: 98, efficiency: 28.5, runDays: 95 },
    suggestedParams: { vibration: 2.0, current: 28, temperature: 82, efficiency: 40, runDays: 95 },
    expectedResults: [{ metric: '振动值', before: 4.8, after: 2.0, unit: 'mm/s', improvement: '-58%' }, { metric: '泵效', before: 28.5, after: 40.0, unit: '%', improvement: '+40.4%' }, { metric: '电机温度', before: 98, after: 82, unit: '°C', improvement: '-16.3%' }],
    steps: [{ title: '振动分析', description: '详细分析振动频谱，定位振动源', duration: '1天' }, { title: '制定方案', description: '根据分析结果制定维护方案', duration: '0.5天' }, { title: '实施维护', description: '执行维护作业', duration: '2天' }, { title: '效果验证', description: '验证振动和运行参数改善情况', duration: '7天' }],
    costEstimate: 50000, benefitEstimate: 95000, reason: '振动偏高，运行天数短但参数已异常，可能存在安装或设备问题', riskAssessment: '不及时处理可能导致设备损坏，维护成本将大幅增加' },
  { id: 'OPT-007', wellId: 'W014', wellName: 'DQ-C003', createTime: '2026-02-22 15:30', status: 'executing', type: '检泵作业', priority: 'urgent',
    currentParams: { efficiency: 20.5, current: 36.5, temperature: 102, vibration: 6.8, dailyLiquid: 18.5 },
    suggestedParams: { efficiency: 45, current: 25, temperature: 80, vibration: 1.8, dailyLiquid: 48 },
    expectedResults: [{ metric: '泵效', before: 20.5, after: 45.0, unit: '%', improvement: '+120%' }, { metric: '日产液', before: 18.5, after: 48.0, unit: 't', improvement: '+159%' }, { metric: '电机温度', before: 102, after: 80, unit: '°C', improvement: '-21.6%' }],
    steps: [{ title: '停机准备', description: '关井放压', duration: '0.5天' }, { title: '起泵检查', description: '起出ESP泵组全面检查', duration: '2天' }, { title: '更换泵组', description: '更换新泵组', duration: '1.5天' }, { title: '试运行', description: '下泵试运行调参', duration: '1天' }, { title: '效果验证', description: '连续运行验证', duration: '7天' }],
    costEstimate: 200000, benefitEstimate: 480000, reason: '泵效极低，电机过热严重，必须立即检泵', riskAssessment: '停产约5天，但可避免电机烧毁' },
]

// ==================== 设计方案库 ====================

export const designSchemes: DesignScheme[] = [
  { id: 'DS-001', name: '新疆-G1井ESP设计方案', createTime: '2026-02-20', wellDepth: 2800, targetProduction: 60, targetHead: 2200, selectedPump: 'TD500-200', designParams: { stages: 220, frequency: 45, cableSpec: '3×16mm²', motorPower: 45, separatorType: '旋转气体分离器' }, status: 'approved', designer: '张工', score: 92 },
  { id: 'DS-002', name: '长庆-H1井ESP设计方案', createTime: '2026-02-18', wellDepth: 2200, targetProduction: 30, targetHead: 1500, selectedPump: 'QYB300-180', designParams: { stages: 180, frequency: 38, cableSpec: '3×10mm²', motorPower: 22, separatorType: '重力式分离器' }, status: 'reviewed', designer: '李工', score: 88 },
  { id: 'DS-003', name: '大庆-I1井ESP设计方案', createTime: '2026-02-15', wellDepth: 3200, targetProduction: 80, targetHead: 2800, selectedPump: 'TD800-250', designParams: { stages: 280, frequency: 50, cableSpec: '3×25mm²', motorPower: 75, separatorType: '旋转气体分离器' }, status: 'designing', designer: '王工', score: 85 },
  { id: 'DS-004', name: '胜利-J1井ESP设计方案', createTime: '2026-02-10', wellDepth: 3500, targetProduction: 120, targetHead: 3200, selectedPump: 'TD1200-300', designParams: { stages: 320, frequency: 50, cableSpec: '3×35mm²', motorPower: 120, separatorType: '旋转气体分离器' }, status: 'implemented', designer: '赵工', score: 95 },
]

// ==================== 工单类型定义 ====================

// 工单状态
export type WorkOrderStatus = 
  | 'discovered'    // 发现问题
  | 'analyzing'     // 分析中
  | 'solution_proposed'  // 已提出解决方案
  | 'pending_approval'   // 待审批
  | 'executing'     // 执行中
  | 'completed'     // 已完成
  | 'closed'        // 已关闭
  | 'cancelled'     // 已取消

// 工单优先级
export type WorkOrderPriority = 'urgent' | 'high' | 'medium' | 'low'

// 问题类型
export type ProblemType = 
  | 'equipment_failure'   // 设备故障
  | 'performance_decline' // 性能下降
  | 'efficiency_low'     // 效率低下
  | 'parameter_abnormal' // 参数异常
  | 'maintenance_due'    // 定期维护
  | 'other'              // 其他

export interface WorkOrder {
  id: string                           // 工单ID
  ticketNo: string                     // 工单编号 WO-20260316-001
  wellId: string                       // 关联井ID
  wellName: string                     // 井名称
  oilField: string                     // 油田
  block: string                        // 区块
  
  // 问题信息
  problemType: ProblemType              // 问题类型
  problemDescription: string           // 问题描述
  severity: WorkOrderPriority          // 严重程度
  
  // 流程状态
  status: WorkOrderStatus               // 当前状态
  discoveredTime: string                // 发现时间
  discoveredBy: string                  // 发现人
  analyzeTime?: string                  // 分析完成时间
  analyzer?: string                     // 分析人
  solutionTime?: string                 // 解决方案提出时间
  solutionProposer?: string             // 解决方案提出人
  executeTime?: string                  // 开始执行时间
  executor?: string                     // 执行人
  completedTime?: string                // 完成时间
  closer?: string                       // 关闭人
  closeTime?: string                    // 关闭时间
  closeReason?: string                  // 关闭原因
  
  // 诊断与分析
  diagnosisResult?: string              // 诊断结果
  rootCause?: string                   // 根本原因
  analysisDetails?: string              // 分析详情
  
  // 解决方案
  solution?: string                     // 解决方案
  solutionSteps?: string[]              // 解决步骤
  estimatedCost?: number                // 预估成本
  actualCost?: number                   // 实际成本
  
  // 执行结果
  executionResult?: string             // 执行结果
  actualImprovement?: string            // 实际改善效果
  remarks?: string                      // 备注
  
  // 元数据
  createTime: string                    // 创建时间
  updateTime: string                    // 更新时间
}

// ==================== 工单数据 ====================

export const workOrders: WorkOrder[] = [
  {
    id: 'WO001',
    ticketNo: 'WO-20260316-001',
    wellId: 'W004',
    wellName: 'DQ-C001',
    oilField: '大庆油田',
    block: '萨尔图区',
    problemType: 'equipment_failure',
    problemDescription: '泵效过低报警，泵效仅22.1%，电流异常升高，疑似泵内堵塞',
    severity: 'urgent',
    status: 'discovered',
    discoveredTime: '2026-03-16 08:00:00',
    discoveredBy: '系统自动',
    createTime: '2026-03-16 08:00:00',
    updateTime: '2026-03-16 08:00:00',
  },
  {
    id: 'WO002',
    ticketNo: 'WO-20260315-002',
    wellId: 'W002',
    wellName: 'CQ-A002',
    oilField: '长庆油田',
    block: '安塞区',
    problemType: 'performance_decline',
    problemDescription: '供液不足预警，动液面下降，沉没度低于安全阈值',
    severity: 'high',
    status: 'analyzing',
    discoveredTime: '2026-03-15 14:30:00',
    discoveredBy: '张三',
    analyzeTime: '2026-03-15 16:00:00',
    analyzer: '李四',
    diagnosisResult: '经多参数综合分析确认为供液不足，建议调整工作参数',
    rootCause: '地层供液能力下降，泵入口处未完全浸没',
    createTime: '2026-03-15 14:30:00',
    updateTime: '2026-03-15 16:00:00',
  },
  {
    id: 'WO003',
    ticketNo: 'WO-20260314-003',
    wellId: 'W006',
    wellName: 'SL-D001',
    oilField: '胜利油田',
    block: '东营区',
    problemType: 'equipment_failure',
    problemDescription: '电机过热报警，温度达到95°C，电流偏高',
    severity: 'high',
    status: 'solution_proposed',
    discoveredTime: '2026-03-14 10:00:00',
    discoveredBy: '王五',
    analyzeTime: '2026-03-14 11:30:00',
    analyzer: '李四',
    diagnosisResult: '电机负载过大，散热不良',
    rootCause: '泵运行频率过高，叶轮磨损导致负载增加',
    analysisDetails: '电流35.2A，超过额定值；振动5.1mm/s，偏高；已运行150天未维护',
    solution: '1. 降低运行频率至42Hz；2. 检查叶轮磨损情况，必要时更换；3. 清理电机散热器',
    solutionSteps: ['第一步：调整变频器参数', '第二步：停机检修', '第三步：更换磨损部件', '第四步：重新启动测试'],
    estimatedCost: 15000,
    solutionTime: '2026-03-14 15:00:00',
    solutionProposer: '李四',
    createTime: '2026-03-14 10:00:00',
    updateTime: '2026-03-14 15:00:00',
  },
  {
    id: 'WO004',
    ticketNo: 'WO-20260312-004',
    wellId: 'W011',
    wellName: 'YC-F002',
    oilField: '延长油田',
    block: '延安区',
    problemType: 'maintenance_due',
    problemDescription: '振动异常，已运行95天，需要定期维护检查',
    severity: 'medium',
    status: 'pending_approval',
    discoveredTime: '2026-03-12 09:00:00',
    discoveredBy: '赵六',
    analyzeTime: '2026-03-12 10:00:00',
    analyzer: '李四',
    diagnosisResult: '振动值4.8mm/s，需进行维护保养',
    rootCause: '长时间运行导致的机械磨损',
    solution: '进行全面维护保养，包括振动传感器校准、紧固连接件、润滑转动部件',
    solutionSteps: ['第一步：停机断电', '第二步：全面检查', '第三步：更换易损件', '第四步：振动测试', '第五步：试运行'],
    estimatedCost: 8000,
    solutionTime: '2026-03-12 14:00:00',
    solutionProposer: '李四',
    createTime: '2026-03-12 09:00:00',
    updateTime: '2026-03-12 14:00:00',
  },
  {
    id: 'WO005',
    ticketNo: 'WO-20260310-005',
    wellId: 'W009',
    wellName: 'XJ-E002',
    oilField: '新疆油田',
    block: '克拉玛依区',
    problemType: 'equipment_failure',
    problemDescription: '井下线控故障，设备离线',
    severity: 'urgent',
    status: 'executing',
    discoveredTime: '2026-03-10 06:00:00',
    discoveredBy: '系统自动',
    analyzeTime: '2026-03-10 07:00:00',
    analyzer: '张工',
    diagnosisResult: '电缆断路或地面控制系统故障',
    solution: '检查地面控制柜，更换故障模块',
    solutionTime: '2026-03-10 08:00:00',
    solutionProposer: '张工',
    executeTime: '2026-03-10 09:00:00',
    executor: '王五',
    createTime: '2026-03-10 06:00:00',
    updateTime: '2026-03-10 09:00:00',
  },
  {
    id: 'WO006',
    ticketNo: 'WO-20260305-006',
    wellId: 'W001',
    wellName: 'CQ-A001',
    oilField: '长庆油田',
    block: '安塞区',
    problemType: 'efficiency_low',
    problemDescription: '泵效42.5%，低于最优区间，需要优化运行参数',
    severity: 'low',
    status: 'completed',
    discoveredTime: '2026-03-05 10:00:00',
    discoveredBy: '李四',
    analyzeTime: '2026-03-05 11:00:00',
    analyzer: '李四',
    diagnosisResult: '运行参数未达到最优',
    rootCause: '频率设定偏低',
    solution: '将频率从42Hz调整至45Hz',
    solutionTime: '2026-03-05 14:00:00',
    solutionProposer: '李四',
    executeTime: '2026-03-06 08:00:00',
    executor: '张三',
    completedTime: '2026-03-06 10:00:00',
    executionResult: '参数调整完成，泵效提升至48%',
    actualImprovement: '泵效提升5.5个百分点',
    createTime: '2026-03-05 10:00:00',
    updateTime: '2026-03-06 10:00:00',
  },
  {
    id: 'WO007',
    ticketNo: 'WO-20260301-007',
    wellId: 'W003',
    wellName: 'CQ-B001',
    oilField: '长庆油田',
    block: '靖边区',
    problemType: 'performance_decline',
    problemDescription: '产液量下降，需要调整工作制度',
    severity: 'medium',
    status: 'closed',
    discoveredTime: '2026-03-01 08:00:00',
    discoveredBy: '张三',
    analyzeTime: '2026-03-01 09:30:00',
    analyzer: '李四',
    diagnosisResult: '气体影响导致泵效下降',
    rootCause: '气油比升高',
    solution: '安装或优化气体分离器',
    solutionTime: '2026-03-01 14:00:00',
    solutionProposer: '李四',
    executeTime: '2026-03-02 09:00:00',
    executor: '王五',
    completedTime: '2026-03-03 16:00:00',
    executionResult: '气体分离器优化完成',
    actualImprovement: '产液量恢复至正常水平',
    closeTime: '2026-03-04 10:00:00',
    closer: '李四',
    closeReason: '问题已解决，设备正常运行',
    createTime: '2026-03-01 08:00:00',
    updateTime: '2026-03-04 10:00:00',
  },
]

// ==================== 诊断记录 ====================

export const diagnosisRecords: DiagnosisRecord[] = [
  { id: 'D001', wellId: 'W002', wellName: 'CQ-A002', time: '2026-03-02 08:30', type: '供液不足', status: 'warning', description: '动液面下降明显，沉没度低于安全阈值，电流波动增大', parameters: { dynamicLevel: 2170, submergence: 280, frequency: 45 }, diagnosisMethod: '多参数综合' },
  { id: 'D002', wellId: 'W004', wellName: 'DQ-C001', time: '2026-03-02 07:15', type: '泵效过低', status: 'alarm', description: '泵效仅22.1%，远低于正常范围，电流异常升高', parameters: { efficiency: 22.1, current: 38.7, temperature: 105 }, diagnosisMethod: '电参数+多参数' },
  { id: 'D003', wellId: 'W006', wellName: 'SL-D001', time: '2026-03-02 06:45', type: '电机过热', status: 'warning', description: '电机温度95°C，接近上限值，电流偏高', parameters: { temperature: 95, current: 35.2, vibration: 5.1 }, diagnosisMethod: '参数诊断' },
  { id: 'D004', wellId: 'W011', wellName: 'YC-F002', time: '2026-03-02 05:20', type: '振动异常', status: 'warning', description: '振动值偏高，可能存在机械磨损或安装不当', parameters: { vibration: 4.8, current: 33.8, runDays: 95 }, diagnosisMethod: '振动分析' },
  { id: 'D005', wellId: 'W001', wellName: 'CQ-A001', time: '2026-03-02 04:00', type: '运行正常', status: 'normal', description: '各项参数均在正常范围内，运行状态正常', parameters: { efficiency: 42.5, current: 28.5, temperature: 85 }, diagnosisMethod: '综合诊断' },
  { id: 'D006', wellId: 'W004', wellName: 'DQ-C001', time: '2026-03-02 03:30', type: '气锁预警', status: 'alarm', description: '气油比偏高，电流呈气锁特征波动，存在气锁风险', parameters: { gasOilRatio: 68, casingPressure: 1.5, efficiency: 22.1 }, diagnosisMethod: '多参数综合' },
  { id: 'D007', wellId: 'W007', wellName: 'SL-D002', time: '2026-03-02 02:10', type: '运行正常', status: 'normal', description: '各项运行参数稳定，运行状态良好', parameters: { efficiency: 45.1, current: 26.8, temperature: 82 }, diagnosisMethod: '综合诊断' },
  { id: 'D008', wellId: 'W008', wellName: 'XJ-E001', time: '2026-03-02 01:00', type: '运行正常', status: 'normal', description: 'ESP泵运行状态良好', parameters: { efficiency: 55.8, current: 18.5, temperature: 68 }, diagnosisMethod: '参数诊断' },
  { id: 'D009', wellId: 'W014', wellName: 'DQ-C003', time: '2026-03-01 22:00', type: '泵效过低', status: 'alarm', description: '泵效仅20.5%，电机过热102°C，振动6.8mm/s', parameters: { efficiency: 20.5, current: 36.5, temperature: 102 }, diagnosisMethod: '综合诊断' },
  { id: 'D010', wellId: 'W006', wellName: 'SL-D001', time: '2026-03-01 18:30', type: '泵漏失', status: 'warning', description: '电参数显示泵漏失特征，泵效下降', parameters: { efficiency: 30.5, current: 35.2, temperature: 95 }, diagnosisMethod: '电参数诊断' },
  { id: 'D011', wellId: 'W010', wellName: 'YC-F001', time: '2026-03-01 15:00', type: '运行正常', status: 'normal', description: '参数稳定，运行正常', parameters: { efficiency: 41.2, current: 27.5, temperature: 83 }, diagnosisMethod: '综合诊断' },
  { id: 'D012', wellId: 'W012', wellName: 'CQ-A003', time: '2026-03-01 12:00', type: '运行正常', status: 'normal', description: '运行良好', parameters: { efficiency: 46.8, current: 25.9, temperature: 80 }, diagnosisMethod: '综合诊断' },
  { id: 'D013', wellId: 'W013', wellName: 'SL-D003', time: '2026-03-01 09:00', type: '运行正常', status: 'normal', description: '各项指标正常', parameters: { efficiency: 43.5, current: 29.2, temperature: 86 }, diagnosisMethod: '综合诊断' },
  { id: 'D014', wellId: 'W015', wellName: 'XJ-E003', time: '2026-03-01 06:00', type: '运行正常', status: 'normal', description: 'ESP运行稳定', parameters: { efficiency: 54.0, current: 19.8, temperature: 70 }, diagnosisMethod: '参数诊断' },
  { id: 'D015', wellId: 'W002', wellName: 'CQ-A002', time: '2026-03-01 03:00', type: '供液不足', status: 'warning', description: '连续监测供液不足趋势加重', parameters: { dynamicLevel: 2180, submergence: 270, frequency: 45 }, diagnosisMethod: '多参数综合' },
]

// ==================== 产量历史 ====================

export const productionHistory: ProductionRecord[] = (() => {
  const records: ProductionRecord[] = []
  const wells = wellList.filter(w => w.status !== 'offline')
  for (let d = 30; d >= 0; d--) {
    const date = new Date(); date.setDate(date.getDate() - d)
    const dateStr = date.toISOString().split('T')[0]
    wells.forEach(w => {
      const v = 0.9 + Math.random() * 0.2
      const liq = w.dailyLiquid * v, oil = w.dailyOil * v
      records.push({ date: dateStr, wellId: w.id, wellName: w.name, liquidVolume: Math.round(liq * 10) / 10, oilVolume: Math.round(oil * 10) / 10, waterVolume: Math.round((liq - oil) * 10) / 10, gasVolume: Math.round(oil * w.gasOilRatio * v) / 10, waterCut: Math.round((1 - oil / liq) * 1000) / 10, pumpEfficiency: Math.round(w.efficiency * v * 10) / 10 })
    })
  }
  return records
})()

// ==================== 九区配置 ====================

export const nineZoneConfig: NineZoneData[] = [
  { zone: 1, zoneName: '供液不足-参数偏低', wellCount: 2, percentage: 14.3, color: '#ff7875', suggestion: '提高供液能力或降低排量', wells: ['W002', 'W011'] },
  { zone: 2, zoneName: '供液不足-参数合理', wellCount: 1, percentage: 7.1, color: '#ffa940', suggestion: '适当降低频率', wells: ['W006'] },
  { zone: 3, zoneName: '供液不足-参数偏高', wellCount: 2, percentage: 14.3, color: '#ff4d4f', suggestion: '大幅降低排量，防止干抽', wells: ['W004', 'W014'] },
  { zone: 4, zoneName: '供液正常-参数偏低', wellCount: 1, percentage: 7.1, color: '#69b1ff', suggestion: '适当提高频率增产', wells: ['W010'] },
  { zone: 5, zoneName: '供液正常-参数合理', wellCount: 5, percentage: 35.7, color: '#52c41a', suggestion: '维持当前运行参数', wells: ['W001', 'W003', 'W007', 'W012', 'W013'] },
  { zone: 6, zoneName: '供液正常-参数偏高', wellCount: 0, percentage: 0, color: '#ffc53d', suggestion: '适当降低频率节能', wells: [] },
  { zone: 7, zoneName: '供液充足-参数偏低', wellCount: 3, percentage: 21.4, color: '#36cfc9', suggestion: '大幅提频增产', wells: ['W005', 'W008', 'W015'] },
  { zone: 8, zoneName: '供液充足-参数合理', wellCount: 0, percentage: 0, color: '#95de64', suggestion: '可适当提频增产', wells: [] },
  { zone: 9, zoneName: '供液充足-参数偏高', wellCount: 0, percentage: 0, color: '#bae637', suggestion: '维持或适当降频', wells: [] },
]

// ==================== 行业标准 ====================

export const industryStandards = [
  { id: 'S001', name: '系统效率', unit: '%', min: 25, max: 65, optimal: 45, category: '效率指标' },
  { id: 'S002', name: '泵效', unit: '%', min: 30, max: 80, optimal: 55, category: '效率指标' },
  { id: 'S003', name: '沉没度', unit: 'm', min: 200, max: 600, optimal: 400, category: '液面指标' },
  { id: 'S004', name: '电机温度', unit: '°C', min: 60, max: 100, optimal: 80, category: '运行指标' },
  { id: 'S005', name: '振动值', unit: 'mm/s', min: 0, max: 5, optimal: 2, category: '运行指标' },
  { id: 'S006', name: '电流偏差', unit: '%', min: -10, max: 10, optimal: 0, category: '电气指标' },
  { id: 'S007', name: '功率因数', unit: '', min: 0.7, max: 1.0, optimal: 0.85, category: '电气指标' },
  { id: 'S008', name: '含水率', unit: '%', min: 0, max: 95, optimal: 70, category: '产出指标' },
  { id: 'S009', name: '气油比', unit: 'm³/t', min: 10, max: 80, optimal: 40, category: '产出指标' },
  { id: 'S010', name: '日产液量', unit: 't/d', min: 10, max: 100, optimal: 50, category: '产出指标' },
]

export const optimizationSuggestions = optimizationSchemes.map(s => ({
  wellId: s.wellId, wellName: s.wellName, type: s.type, priority: s.priority,
  currentValue: Object.entries(s.currentParams).map(([k, v]) => `${k}:${v}`).join(', '),
  suggestedValue: Object.entries(s.suggestedParams).map(([k, v]) => `${k}:${v}`).join(', '),
  expectedImprovement: s.expectedResults.map(r => `${r.metric}${r.improvement}`).join('，'),
  reason: s.reason,
}))
