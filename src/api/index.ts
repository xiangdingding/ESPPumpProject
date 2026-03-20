import { 
  mockOrgList, 
  mockOrgTree, 
  mockOrgSchema, 
  mockWellList, 
  mockWellSchema,
  mockProductionDaily,
  mockSynWeight,
  mockSynLimit,
  mockFaultTypeChart,
  mockTables
} from './mockData'

// 模拟网络延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 获取所有表
export async function fetchTables() {
  await delay(100)
  return mockTables
}

// 获取组织机构
export async function fetchOrgList() {
  await delay(100)
  return mockOrgList
}

// 获取组织机构树形结构
export async function fetchOrgTree() {
  await delay(100)
  return mockOrgTree
}

// 获取组织机构表结构
export async function fetchOrgSchema() {
  await delay(100)
  return mockOrgSchema
}

// 获取井表结构
export async function fetchWellSchema() {
  await delay(100)
  return mockWellSchema
}

// 获取井基础信息
export async function fetchWellList() {
  await delay(100)
  return mockWellList
}

// 获取单井日生产报表
export async function fetchProductionDaily() {
  await delay(100)
  return mockProductionDaily
}

// 获取电泵井多参规则权重
export async function fetchSynWeight() {
  await delay(100)
  return mockSynWeight
}

// 获取多参系数界限表
export async function fetchSynLimit() {
  await delay(100)
  return mockSynLimit
}

// 获取多参规则图版
export async function fetchFaultTypeChart() {
  await delay(100)
  return mockFaultTypeChart
}

// 获取表结构
export async function fetchTableSchema(tableName: string) {
  await delay(100)
  const schemas: Record<string, any[]> = {
    bas_org: mockOrgSchema,
    bas_well: mockWellSchema,
  }
  return schemas[tableName] || []
}

export interface PumpCurvePoint {
  id: number
  Well_Id: string
  Curve_30_HZ_X: number; Curve_30_HZ_Y: number
  Curve_35_HZ_X: number; Curve_35_HZ_Y: number
  Curve_40_HZ_X: number; Curve_40_HZ_Y: number
  Curve_45_HZ_X: number; Curve_45_HZ_Y: number
  Curve_50_HZ_X: number; Curve_50_HZ_Y: number
  Curve_55_HZ_X: number; Curve_55_HZ_Y: number
  Curve_60_HZ_X: number; Curve_60_HZ_Y: number
  Curve_65_HZ_X: number; Curve_65_HZ_Y: number
  Curve_70_HZ_X: number; Curve_70_HZ_Y: number
  Curve_Minimum_X: number; Curve_Minimum_Y: number
  Curve_Optimum_X: number; Curve_Optimum_Y: number
  Curve_Maximum_X: number; Curve_Maximum_Y: number
  Update_Time: string
}

export async function fetchPumpCurve(wellId: string): Promise<PumpCurvePoint[]> {
  try {
    const res = await fetch(`/api/rpt_correct_character_curve/${encodeURIComponent(wellId)}`)
    const json = await res.json()
    if (json.success && json.data?.length > 0) return json.data
  } catch { /* fall through to mock */ }
  const { generatePumpCurve } = await import('../mock/pumpCurveMock')
  return generatePumpCurve(wellId)
}
