// Mock数据 - 用于前端开发测试

// 组织机构数据
export const mockOrgList = [
  { id: 1, org_name: "华北油田分公司", parent_id: null },
  { id: 2, org_name: "采油一厂", parent_id: 1 },
  { id: 3, org_name: "采油二厂", parent_id: 1 },
  { id: 4, org_name: "采油三厂", parent_id: 1 },
]

export const mockOrgTree = [
  {
    id: 1,
    org_name: "华北油田分公司",
    children: [
      { id: 2, org_name: "采油一厂", children: [] },
      { id: 3, org_name: "采油二厂", children: [] },
      { id: 4, org_name: "采油三厂", children: [] },
    ]
  }
]

export const mockOrgSchema = [
  { field: "id", type: "int", comment: "组织ID" },
  { field: "org_name", type: "varchar", comment: "组织名称" },
  { field: "parent_id", type: "int", comment: "父组织ID" },
]

// 井基础信息数据
export const mockWellList = [
  { id: 1, well_name: "P1", well_type: "油井", org_id: 2, lat: 38.95, lng: 116.12 },
  { id: 2, well_name: "P2", well_type: "油井", org_id: 2, lat: 38.96, lng: 116.13 },
  { id: 3, well_name: "P3", well_type: "油井", org_id: 2, lat: 38.97, lng: 116.14 },
  { id: 4, well_name: "P4", well_type: "油井", org_id: 3, lat: 38.98, lng: 116.15 },
  { id: 5, well_name: "P5", well_type: "油井", org_id: 3, lat: 38.99, lng: 116.16 },
]

export const mockWellSchema = [
  { field: "id", type: "int", comment: "井ID" },
  { field: "well_name", type: "varchar", comment: "井号" },
  { field: "well_type", type: "varchar", comment: "井型" },
  { field: "org_id", type: "int", comment: "所属组织" },
  { field: "lat", type: "decimal", comment: "纬度" },
  { field: "lng", type: "decimal", comment: "经度" },
]

// 日生产报表数据
export const mockProductionDaily = [
  { well_id: 1, well_name: "P1", prod_date: "2026-03-15", oil_prod: 12.5, water_prod: 45.2, liquid_prod: 57.7 },
  { well_id: 2, well_name: "P2", prod_date: "2026-03-15", oil_prod: 10.3, water_prod: 38.6, liquid_prod: 48.9 },
  { well_id: 3, well_name: "P3", prod_date: "2026-03-15", oil_prod: 15.8, water_prod: 52.1, liquid_prod: 67.9 },
  { well_id: 1, well_name: "P1", prod_date: "2026-03-16", oil_prod: 11.9, water_prod: 44.8, liquid_prod: 56.7 },
  { well_id: 2, well_name: "P2", prod_date: "2026-03-16", oil_prod: 9.8, water_prod: 37.2, liquid_prod: 47.0 },
]

// 电泵井多参规则权重数据
export const mockSynWeight = [
  { id: 1, fault_type: "供液不足", indicator: "动液面", weight: 0.4 },
  { id: 2, fault_type: "供液不足", indicator: "泵效", weight: 0.35 },
  { id: 3, fault_type: "供液不足", indicator: "电流", weight: 0.25 },
  { id: 4, fault_type: "泵漏失", indicator: "动液面", weight: 0.2 },
  { id: 5, fault_type: "泵漏失", indicator: "泵效", weight: 0.5 },
  { id: 6, fault_type: "泵漏失", indicator: "电流", weight: 0.3 },
]

// 多参系数界限表数据
export const mockSynLimit = [
  { id: 1, fault_type: "供液不足", indicator: "动液面", min_val: 0, max_val: 600, severity: "normal" },
  { id: 2, fault_type: "供液不足", indicator: "泵效", min_val: 0, max_val: 0.5, severity: "warning" },
  { id: 3, fault_type: "泵漏失", indicator: "泵效", min_val: 0.3, max_val: 0.7, severity: "warning" },
]

// 故障类型图版数据
export const mockFaultTypeChart = [
  { id: 1, fault_type: "供液不足", x: 0.3, y: 0.7, count: 15 },
  { id: 2, fault_type: "泵漏失", x: 0.6, y: 0.4, count: 8 },
  { id: 3, fault_type: "管柱漏失", x: 0.5, y: 0.6, count: 5 },
  { id: 4, fault_type: "气锁", x: 0.4, y: 0.3, count: 3 },
]

// 表列表
export const mockTables = [
  "bas_org",
  "bas_well", 
  "rpt_well_prod_daily",
  "syn_weight",
  "syn_limit",
  "syn_fault_type_chart",
]
