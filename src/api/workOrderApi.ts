const BASE = '/api/workorders'

export interface WorkOrderLog {
  id: number
  order_id: string
  phase: string
  action: string
  operator: string
  detail: string
  created_at: string
}

export interface WorkOrderDTO {
  id: string
  ticket_no: string
  well_id: string
  well_name: string
  oil_field: string
  block_name: string
  condition_code: string
  diagnosis_type: string
  problem_type: string
  problem_desc: string
  severity: string
  status: string
  priority: string
  assigned_team: string
  discovered_by: string
  discovered_time: string
  analyzer: string
  analyze_time: string
  solution: string
  solution_steps: string[]
  solution_time: string
  solution_by: string
  executor: string
  execute_time: string
  verify_result: string
  verify_time: string
  verify_by: string
  completed_time: string
  close_reason: string
  close_time: string
  closed_by: string
  estimated_cost: number
  actual_cost: number
  remark: string
  created_at: string
  updated_at: string
  logs: WorkOrderLog[]
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options })
  const json = await res.json()
  if (!json.success) throw new Error(json.error || '请求失败')
  return json.data
}

export async function fetchWorkOrders(params?: Record<string, string>): Promise<WorkOrderDTO[]> {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return request<WorkOrderDTO[]>(`${BASE}${qs}`)
}

export async function fetchWorkOrderStats(): Promise<Record<string, number>> {
  return request<Record<string, number>>(`${BASE}/stats`)
}

export async function fetchWorkOrder(id: string): Promise<WorkOrderDTO> {
  return request<WorkOrderDTO>(`${BASE}/${id}`)
}

export async function fetchWorkOrderByWell(wellId: string): Promise<WorkOrderDTO | null> {
  return request<WorkOrderDTO | null>(`${BASE}/well/${wellId}`)
}

export async function createWorkOrder(data: Partial<WorkOrderDTO>): Promise<WorkOrderDTO> {
  return request<WorkOrderDTO>(BASE, { method: 'POST', body: JSON.stringify(data) })
}

export async function advanceWorkOrder(id: string, data: Record<string, unknown>): Promise<WorkOrderDTO> {
  return request<WorkOrderDTO>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(data) })
}

export async function addWorkOrderLog(id: string, phase: string, action: string, operator: string, detail: string): Promise<WorkOrderLog[]> {
  return request<WorkOrderLog[]>(`${BASE}/${id}/log`, { method: 'POST', body: JSON.stringify({ phase, action, operator, detail }) })
}
