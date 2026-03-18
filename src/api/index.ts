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
