import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { Card, Radio, Space, Table, Tag, Tooltip, Button, message, Modal, Descriptions, Divider, Steps, Select, Input, Timeline, Badge } from 'antd'
import {
  EnvironmentOutlined, ToolOutlined, ExclamationCircleOutlined,
  CheckCircleOutlined, ClockCircleOutlined, SendOutlined,
  StopOutlined, ThunderboltOutlined, AlertOutlined,
  SafetyCertificateOutlined, WarningOutlined, FileSearchOutlined,
  AuditOutlined, SolutionOutlined, FileDoneOutlined,
  EditOutlined, EyeOutlined, ReloadOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import type { WellInfo } from '../../mock/wellData'
import {
  LEVEL1_CONDITION_CODES,
  LEVEL2_CONDITION_CODES,
  LEVEL1_CONDITION_NAMES,
  LEVEL2_CONDITION_NAMES,
  workConditionTypes,
} from '../../mock/wellData'
import { createWorkOrder, advanceWorkOrder, addWorkOrderLog, fetchWorkOrderByWell, fetchWorkOrders, type WorkOrderDTO } from '../../api/workOrderApi'

const LEVEL1_CODES_SET = new Set<string>(LEVEL1_CONDITION_CODES as unknown as string[])
const LEVEL2_CODES_SET = new Set<string>(LEVEL2_CONDITION_CODES as unknown as string[])
const LEVEL2_CONDITION_ABNORMAL = new Set<string>(['C01', 'C03', 'C04', 'C05'])
const NORMAL_CODE = 'C06'

const isLevel1 = (code: string) => LEVEL1_CODES_SET.has(code)
const isLevel2 = (code: string) => LEVEL2_CODES_SET.has(code)
const isLevel2Abnormal = (code: string) => LEVEL2_CONDITION_ABNORMAL.has(code)
const isNormal = (code: string) => code === NORMAL_CODE

const level1Color = '#ff4d4f'
const level2Color = '#fa8c16'
const normalColor = '#52c41a'

const diagnosisTypeMap: Record<string, string> = {
  C01: '气体影响', C02: '气锁', C03: '稠油及乳化', C04: '叶轮磨损',
  C05: '供液不足', C06: '运行正常', C07: '泵内堵塞', C08: '泵入口堵',
  C09: '泵反转', C10: '出砂', C11: '轴断', C12: '管柱漏失',
}

const descriptionMap: Record<string, string> = {
  C01: '气油比偏高，电流波动增大，泵效下降明显',
  C02: '泵腔充满气体，固定阀/游动阀无法启闭，产量归零',
  C03: '原油黏度高，抽汲阻力增大，电流持续偏高',
  C04: '叶轮间隙增大，扬程排量同步下降，泵效持续走低',
  C05: '动液面下降，沉没度不足，泵筒不能充满',
  C06: '各项参数均在正常范围内，设备运行状态良好',
  C07: '结蜡/结垢堵塞阀座，排量急剧下降',
  C08: '泵入口筛管堵塞，液体无法进入泵腔',
  C09: '电机相序接反，叶轮反转，无法产生扬程',
  C10: '地层出砂，含砂浓度超标，冲蚀泵叶轮',
  C11: '泵轴疲劳断裂，电机与泵失去机械连接',
  C12: '油管丝扣松动或腐蚀穿孔，举升液体回流',
}

const diagnosisBasisMap: Record<string, string> = {
  C01: '电流波动增大，泵效下降，气油比偏高',
  C02: '电流骤降至空载值，产量归零，泵完全气锁',
  C03: '电流持续偏高，功率增大，产液缓降',
  C04: '扬程/流量比下降，泵效持续走低',
  C05: '沉没度不足，动液面下降，间歇出液',
  C06: '综合参数正常，运行平稳',
  C07: '产液骤降>50%，电流升高，泵效<20%',
  C08: '产液骤降但动液面不降，电流降低',
  C09: '启泵后无产液，电流仅正常40~60%',
  C10: '振动异常增大，电流波动，含砂超标',
  C11: '电流突降至空载值，产量瞬间归零',
  C12: '电参数正常但产量偏低，油管试压不合格',
}

const treatmentMap: Record<string, string> = {
  C01: '安装气体分离器，增大沉没度，降频',
  C02: '停机放气，安装高效分离器，加深泵挂',
  C03: '井筒加热降黏，加注破乳剂，降低冲次',
  C04: '起泵检修更换叶轮，加装除砂器',
  C05: '降频匹配供液，改间歇抽油，酸化增产',
  C06: '维持当前参数，定期巡检',
  C07: '热洗井/化学清洗，起泵清理阀座',
  C08: '反洗井冲洗，清理入口筛管',
  C09: '停机调换相序，安装相序保护器',
  C10: '加装除砂器，选用耐磨泵级，化学固砂',
  C11: '停机起泵，更换泵组和传动轴',
  C12: '起管柱试压定位漏点，更换腐蚀油管',
}

const statusColorMap: Record<string, string> = {
  normal: '#52c41a', warning: '#faad14', alarm: '#ff4d4f', offline: '#d9d9d9',
}

const statusBgMap: Record<string, string> = {
  alarm: '#fff1f0', warning: '#fffbe6', normal: '#f6ffed', offline: '#fafafa',
}

const statusTextMap: Record<string, string> = {
  normal: '正常', warning: '预警', alarm: '报警', offline: '离线',
}

const statusPriority: Record<string, number> = { alarm: 0, warning: 1, normal: 2, offline: 3 }

function hashId(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = ((h << 5) - h + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

function mockAlarmDate(wellId: string): string {
  const h = hashId(wellId)
  const day = 1 + (h % 17)
  const hour = h % 24
  const min = (h * 7) % 60
  return `2026-03-${String(day).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

function nowStr(): string {
  return new Date().toLocaleString('zh-CN', { hour12: false })
}

// ==================== 工单类型定义 ====================

type WOPhase = 'discovered' | 'analyzing' | 'executing' | 'verifying' | 'closed'

interface OperationLog {
  time: string
  phase: WOPhase
  action: string
  operator: string
  detail?: string
}

interface WorkOrder {
  id: string
  wellId: string
  wellName: string
  conditionCode: string
  diagnosisType: string
  severity: 'alarm' | 'warning'
  phase: WOPhase
  priority: string
  team: string
  remark: string
  createdAt: string
  logs: OperationLog[]
  verifyResult?: string
  closeReason?: string
}

const phaseIndex: Record<WOPhase, number> = {
  discovered: 0, analyzing: 1, executing: 2, verifying: 3, closed: 4,
}

const phaseLabel: Record<WOPhase, string> = {
  discovered: '发现问题', analyzing: '分析问题', executing: '执行处理', verifying: '验证结果', closed: '问题关闭',
}

const phaseColor: Record<WOPhase, string> = {
  discovered: '#ff4d4f', analyzing: '#fa8c16', executing: '#1677ff', verifying: '#722ed1', closed: '#52c41a',
}

const emergencyActionMap: Record<string, { label: string; icon: React.ReactNode; color: string }[]> = {
  C02: [
    { label: '紧急停泵', icon: <StopOutlined />, color: '#ff4d4f' },
    { label: '开套管放气', icon: <ThunderboltOutlined />, color: '#fa8c16' },
    { label: '派遣作业队', icon: <SendOutlined />, color: '#1677ff' },
  ],
  C07: [
    { label: '紧急停泵', icon: <StopOutlined />, color: '#ff4d4f' },
    { label: '安排热洗井', icon: <ThunderboltOutlined />, color: '#fa8c16' },
    { label: '创建检泵工单', icon: <SendOutlined />, color: '#1677ff' },
  ],
  C08: [
    { label: '紧急停泵', icon: <StopOutlined />, color: '#ff4d4f' },
    { label: '安排反洗井', icon: <ThunderboltOutlined />, color: '#fa8c16' },
    { label: '创建检泵工单', icon: <SendOutlined />, color: '#1677ff' },
  ],
  C09: [
    { label: '紧急停泵', icon: <StopOutlined />, color: '#ff4d4f' },
    { label: '调换电缆相序', icon: <ThunderboltOutlined />, color: '#fa8c16' },
    { label: '确认转向后重启', icon: <CheckCircleOutlined />, color: '#52c41a' },
  ],
  C11: [
    { label: '紧急停泵', icon: <StopOutlined />, color: '#ff4d4f' },
    { label: '安排起泵作业', icon: <SendOutlined />, color: '#1677ff' },
    { label: '申请备件调拨', icon: <ClockCircleOutlined />, color: '#722ed1' },
  ],
  C10: [
    { label: '降频运行', icon: <ThunderboltOutlined />, color: '#fa8c16' },
    { label: '安排除砂作业', icon: <SendOutlined />, color: '#1677ff' },
    { label: '取样化验含砂', icon: <ClockCircleOutlined />, color: '#722ed1' },
  ],
  C12: [
    { label: '降频降载', icon: <ThunderboltOutlined />, color: '#fa8c16' },
    { label: '安排试压检漏', icon: <SendOutlined />, color: '#1677ff' },
    { label: '创建换管工单', icon: <ClockCircleOutlined />, color: '#722ed1' },
  ],
}

const warningActionMap: Record<string, { label: string; icon: React.ReactNode; color: string }[]> = {
  C01: [
    { label: '降频至35Hz', icon: <ThunderboltOutlined />, color: '#fa8c16' },
    { label: '检查分离器', icon: <ToolOutlined />, color: '#1677ff' },
    { label: '持续监测', icon: <ClockCircleOutlined />, color: '#52c41a' },
  ],
  C03: [
    { label: '加注降黏剂', icon: <ThunderboltOutlined />, color: '#fa8c16' },
    { label: '降低冲次', icon: <ToolOutlined />, color: '#1677ff' },
    { label: '安排热洗井', icon: <SendOutlined />, color: '#722ed1' },
  ],
  C04: [
    { label: '降频延寿', icon: <ThunderboltOutlined />, color: '#fa8c16' },
    { label: '安排检泵', icon: <SendOutlined />, color: '#1677ff' },
    { label: '申请备件', icon: <ClockCircleOutlined />, color: '#722ed1' },
  ],
  C05: [
    { label: '降频至30Hz', icon: <ThunderboltOutlined />, color: '#fa8c16' },
    { label: '改间歇抽油', icon: <ToolOutlined />, color: '#1677ff' },
    { label: '申请增产措施', icon: <SendOutlined />, color: '#722ed1' },
  ],
  C10: [
    { label: '降频运行', icon: <ThunderboltOutlined />, color: '#fa8c16' },
    { label: '取样化验', icon: <ClockCircleOutlined />, color: '#1677ff' },
    { label: '持续监测', icon: <CheckCircleOutlined />, color: '#52c41a' },
  ],
  C12: [
    { label: '降频降载', icon: <ThunderboltOutlined />, color: '#fa8c16' },
    { label: '安排试压', icon: <SendOutlined />, color: '#1677ff' },
    { label: '持续监测', icon: <CheckCircleOutlined />, color: '#52c41a' },
  ],
}

// ==================== 组件 ====================

interface GISWellMapProps {
  wells: WellInfo[]
  height?: number
  middleSlot?: React.ReactNode
}

function computeLayout(wells: WellInfo[], width: number, height: number) {
  const positions: Record<string, [number, number]> = {}
  if (wells.length === 0) return positions
  const cols = Math.ceil(Math.sqrt(wells.length))
  const rows = Math.ceil(wells.length / cols)
  const cellW = width / (cols + 1)
  const cellH = height / (rows + 1)
  wells.forEach((w, idx) => {
    const row = Math.floor(idx / cols)
    const col = idx % cols
    const x = cellW * (col + 1) + (Math.sin(idx * 13) * cellW * 0.15)
    const y = cellH * (row + 1) + (Math.cos(idx * 17) * cellH * 0.15)
    positions[w.id] = [x, y]
  })
  return positions
}

interface TableRecord extends WellInfo {
  diagnosisType: string
  description: string
  diagnosisBasis: string
  treatment: string
  alarmDate: string
}

const GISWellMap: React.FC<GISWellMapProps> = ({ wells, height = 420, middleSlot }) => {
  const [filter, setFilter] = useState<'all' | 'level1' | 'level2'>('all')

  // 工单缓存（wellId -> WorkOrderDTO）
  const [woCache, setWoCache] = useState<Record<string, WorkOrderDTO>>({})
  const [modalVisible, setModalVisible] = useState(false)
  const [currentWellId, setCurrentWellId] = useState<string | null>(null)
  const [formPriority, setFormPriority] = useState('high')
  const [formTeam, setFormTeam] = useState('team1')
  const [formRemark, setFormRemark] = useState('')
  const [formVerifyResult, setFormVerifyResult] = useState('')
  const [formCloseReason, setFormCloseReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [apiAvailable, setApiAvailable] = useState(true)

  const getWO = (wellId: string) => woCache[wellId]

  const cacheWO = useCallback((wo: WorkOrderDTO) => {
    const normalized = {
      ...wo,
      solution_steps: typeof wo.solution_steps === 'string' ? (() => { try { return JSON.parse(wo.solution_steps) } catch { return [] } })() : (wo.solution_steps || []),
    }
    setWoCache(prev => ({ ...prev, [normalized.well_id]: normalized }))
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchWorkOrders().then(orders => {
      if (cancelled) return
      const cache: Record<string, WorkOrderDTO> = {}
      for (const wo of orders) {
        const norm: WorkOrderDTO = {
          ...wo,
          solution_steps: typeof wo.solution_steps === 'string'
            ? (() => { try { return JSON.parse(wo.solution_steps as unknown as string) } catch { return [] } })()
            : (wo.solution_steps || []),
          logs: wo.logs || [],
        }
        if (!cache[norm.well_id] || norm.created_at > cache[norm.well_id].created_at) {
          cache[norm.well_id] = norm
        }
      }
      setWoCache(cache)
    }).catch(() => setApiAvailable(false))
    return () => { cancelled = true }
  }, [])

  const toWOPhase = (status: string): WOPhase => {
    const map: Record<string, WOPhase> = {
      discovered: 'discovered', analyzing: 'analyzing', solution_proposed: 'analyzing',
      pending_approval: 'analyzing', executing: 'executing', verifying: 'verifying',
      completed: 'closed', closed: 'closed', cancelled: 'closed',
    }
    return map[status] || 'discovered'
  }

  // 井数据
  const level1WellsAll = useMemo(() => wells.filter(w => isLevel1(w.workConditionCode)), [wells])
  const level2WellsAll = useMemo(() => wells.filter(w => isLevel2(w.workConditionCode)), [wells])
  const level2AbnormalWellsAll = useMemo(() => wells.filter(w => isLevel2Abnormal(w.workConditionCode)), [wells])
  const normalWellsAll = useMemo(() => wells.filter(w => isNormal(w.workConditionCode)), [wells])

  const filteredWells = useMemo(() => {
    if (filter === 'level1') return level1WellsAll
    if (filter === 'level2') return level2WellsAll
    return wells
  }, [wells, filter, level1WellsAll, level2WellsAll])

  const layout = useMemo(() => {
    if (filter === 'all') {
      return { ...computeLayout(level1WellsAll, 100, 100), ...computeLayout(level2WellsAll, 100, 100), ...computeLayout(normalWellsAll, 100, 100) }
    }
    if (filter === 'level1') return computeLayout(level1WellsAll, 100, 100)
    if (filter === 'level2') return computeLayout(level2WellsAll, 100, 100)
    return computeLayout(filteredWells, 100, 100)
  }, [wells, filter, level1WellsAll, level2WellsAll, normalWellsAll, filteredWells])

  const mapOption = useMemo(() => {
    const mkData = (list: WellInfo[], level: number, condNames: Record<string, string>, fallback?: string) =>
      list.map(w => ({
        value: layout[w.id] || [50, 50], name: w.name, oilField: w.oilField, block: w.block,
        condition: condNames[w.workConditionCode] || fallback || '', dailyLiquid: w.dailyLiquid, efficiency: w.efficiency, level,
      }))
    const level1Data = mkData(filteredWells.filter(w => isLevel1(w.workConditionCode)), 1, LEVEL1_CONDITION_NAMES)
    const level2Data = mkData(filteredWells.filter(w => isLevel2Abnormal(w.workConditionCode)), 2, LEVEL2_CONDITION_NAMES)
    const normalData = mkData(filteredWells.filter(w => isNormal(w.workConditionCode)), 0, {}, '正常运行')
    return {
      backgroundColor: '#f5f7fa',
      tooltip: {
        trigger: 'item',
        formatter: (params: unknown) => {
          const d = (params as { data: typeof level1Data[0] }).data
          const color = d.level === 1 ? level1Color : d.level === 2 ? level2Color : normalColor
          return `<div style="min-width:160px;background:#fff;padding:8px;border-radius:4px;border:1px solid #eee">
            <div style="font-weight:600;margin-bottom:4px">${d.name}</div>
            <div style="font-size:11px;color:#666">
              <div>${d.oilField} · ${d.block}</div>
              <div style="margin-top:2px"><span style="color:${color};font-weight:500">${d.condition}</span></div>
              <div style="margin-top:2px">液 ${d.dailyLiquid}t/d · 效 ${d.efficiency}%</div>
            </div></div>`
        },
      },
      grid: { left: 8, right: 8, top: 8, bottom: 8 },
      xAxis: { type: 'value', min: 0, max: 100, show: false },
      yAxis: { type: 'value', min: 0, max: 100, show: false },
      series: [
        ...(level1Data.length > 0 ? [{ name: '一级工况', type: 'scatter', data: level1Data, symbolSize: 12, itemStyle: { color: level1Color, borderColor: '#fff', borderWidth: 1.5 } }] : []),
        ...(level2Data.length > 0 ? [{ name: '二级工况', type: 'scatter', data: level2Data, symbolSize: 12, itemStyle: { color: level2Color, borderColor: '#fff', borderWidth: 1.5 } }] : []),
        ...(normalData.length > 0 ? [{ name: '正常运行', type: 'scatter', data: normalData, symbolSize: 12, itemStyle: { color: normalColor, borderColor: '#fff', borderWidth: 1.5 } }] : []),
      ],
    }
  }, [filteredWells, layout])

  const tableData = useMemo(() => {
    const toRecord = (w: WellInfo): TableRecord => ({
      ...w,
      diagnosisType: diagnosisTypeMap[w.workConditionCode] || '运行正常',
      description: descriptionMap[w.workConditionCode] || '运行正常',
      diagnosisBasis: diagnosisBasisMap[w.workConditionCode] || '综合参数正常',
      treatment: treatmentMap[w.workConditionCode] || '维持当前参数',
      alarmDate: w.status === 'normal' ? mockAlarmDate(w.id).replace(/^\d{4}-\d{2}-/, '2026-03-') : mockAlarmDate(w.id),
    })
    const abnormal = filteredWells.filter(w => w.status === 'alarm' || w.status === 'warning')
    const normal = filteredWells.filter(w => w.status === 'normal')
    const offline = filteredWells.filter(w => w.status === 'offline')
    abnormal.sort((a, b) => (statusPriority[a.status] ?? 9) - (statusPriority[b.status] ?? 9))

    const normalToShow = Math.min(normal.length, Math.max(5, Math.ceil(abnormal.length * 0.6)))
    const offlineToShow = Math.min(offline.length, 3)
    return [
      ...abnormal.map(toRecord),
      ...offline.slice(0, offlineToShow).map(toRecord),
      ...normal.slice(0, normalToShow).map(toRecord),
    ]
  }, [filteredWells])

  // ========== 工单操作（API-backed with fallback） ==========

  const openModal = async (record: TableRecord) => {
    setCurrentWellId(record.id)
    setFormRemark('')
    setFormVerifyResult('')
    setFormCloseReason('')
    setSubmitting(false)

    const cached = getWO(record.id)
    if (cached) {
      setFormPriority(cached.priority)
      setFormTeam(cached.assigned_team || 'team1')
      setModalVisible(true)
      return
    }

    if (apiAvailable) {
      try {
        const existing = await fetchWorkOrderByWell(record.id)
        if (existing) {
          cacheWO(existing)
          setFormPriority(existing.priority)
          setFormTeam(existing.assigned_team || 'team1')
          setModalVisible(true)
          return
        }
      } catch { setApiAvailable(false) }
    }

    // Create new work order
    const severity = record.status === 'alarm' ? 'urgent' : 'high'
    if (apiAvailable) {
      try {
        const newWO = await createWorkOrder({
          well_id: record.id, well_name: record.name,
          oil_field: record.oilField, block_name: record.block,
          condition_code: record.workConditionCode, diagnosis_type: record.diagnosisType,
          problem_desc: record.description, severity, priority: severity,
          discovered_by: '智能诊断系统',
        })
        cacheWO(newWO)
        setFormPriority(severity)
        setFormTeam('team1')
        setModalVisible(true)
        return
      } catch { setApiAvailable(false) }
    }

    // Fallback: in-memory
    const fallbackWO: WorkOrderDTO = {
      id: `WO-${Date.now().toString(36).toUpperCase()}`, ticket_no: `WO-LOCAL-${Date.now()}`,
      well_id: record.id, well_name: record.name, oil_field: record.oilField, block_name: record.block,
      condition_code: record.workConditionCode, diagnosis_type: record.diagnosisType,
      problem_type: 'parameter_abnormal', problem_desc: record.description,
      severity, status: 'discovered', priority: severity, assigned_team: '',
      discovered_by: '智能诊断系统', discovered_time: nowStr(),
      analyzer: '', analyze_time: '', solution: '', solution_steps: [], solution_time: '', solution_by: '',
      executor: '', execute_time: '', verify_result: '', verify_time: '', verify_by: '',
      completed_time: '', close_reason: '', close_time: '', closed_by: '',
      estimated_cost: 0, actual_cost: 0, remark: '', created_at: nowStr(), updated_at: nowStr(),
      logs: [{ id: 0, order_id: '', phase: 'discovered', action: '系统自动发现异常', operator: '智能诊断系统', detail: `检测到 ${record.diagnosisType}（${record.workConditionCode}）`, created_at: nowStr() }],
    }
    cacheWO(fallbackWO)
    setFormPriority(severity)
    setFormTeam('team1')
    setModalVisible(true)
  }

  const currentRecord = useMemo(() => tableData.find(r => r.id === currentWellId), [tableData, currentWellId])
  const currentWO = currentWellId ? woCache[currentWellId] : undefined
  const currentPhase: WOPhase = currentWO ? toWOPhase(currentWO.status) : 'discovered'
  const conditionDetail = currentRecord ? workConditionTypes.find(wc => wc.code === currentRecord.workConditionCode) : null

  const quickActions = currentRecord
    ? (currentRecord.status === 'alarm'
      ? (emergencyActionMap[currentRecord.workConditionCode] || emergencyActionMap['C02'])
      : (warningActionMap[currentRecord.workConditionCode] || warningActionMap['C05']))
    : []

  const doAdvance = async (data: Record<string, unknown>) => {
    if (!currentWellId || !currentWO) return
    setSubmitting(true)
    try {
      if (apiAvailable) {
        const updated = await advanceWorkOrder(currentWO.id, data)
        cacheWO(updated)
      } else {
        setWoCache(prev => {
          const wo = prev[currentWellId]
          if (!wo) return prev
          return { ...prev, [currentWellId]: { ...wo, ...data, status: (data.status as string) || wo.status, updated_at: nowStr() } as WorkOrderDTO }
        })
      }
    } catch {
      setApiAvailable(false)
      setWoCache(prev => {
        const wo = prev[currentWellId]
        if (!wo) return prev
        return { ...prev, [currentWellId]: { ...wo, ...data, status: (data.status as string) || wo.status, updated_at: nowStr() } as WorkOrderDTO }
      })
    }
    setSubmitting(false)
  }

  const advanceToAnalyzing = () => doAdvance({
    status: 'analyzing', analyzer: '系统管理员', analyze_time: nowStr(),
    log_action: '开始分析问题', log_detail: `确认诊断结论：${currentRecord?.diagnosisType}，进入问题分析阶段`,
  })

  const advanceToExecuting = async () => {
    const teamName = formTeam === 'team1' ? '采油一班' : formTeam === 'team2' ? '采油二班' : formTeam === 'team3' ? '维修班' : '作业队'
    await doAdvance({
      status: 'executing', priority: formPriority, assigned_team: formTeam,
      executor: teamName, execute_time: nowStr(), remark: formRemark,
      solution: conditionDetail?.suggestions.join('；') || '', solution_steps: JSON.stringify(conditionDetail?.suggestions || []),
      solution_time: nowStr(), solution_by: '系统管理员',
      log_action: '制定方案并下发工单',
      log_detail: `优先级：${formPriority}，指派：${teamName}${formRemark ? `，备注：${formRemark}` : ''}`,
    })
    message.success(`工单 ${currentWO?.ticket_no} 已下发执行`)
  }

  const handleQuickAction = async (label: string) => {
    if (!currentWellId || !currentWO) return
    try {
      if (apiAvailable) {
        await addWorkOrderLog(currentWO.id, currentWO.status, `执行操作：${label}`, '系统管理员', `操作指令"${label}"已下发至现场`)
        const updated = await fetchWorkOrderByWell(currentWellId)
        if (updated) cacheWO(updated)
      }
    } catch { /* ignore */ }
    message.success(`${currentRecord?.name}: ${label} 指令已下发`)
  }

  const advanceToVerifying = () => doAdvance({
    status: 'verifying', verify_time: nowStr(), verify_by: '系统管理员',
    log_action: '处理完成，进入验证阶段', log_detail: '现场处理完毕，等待运行参数恢复确认',
  })

  const advanceToClosed = async () => {
    await doAdvance({
      status: 'closed', verify_result: formVerifyResult, close_reason: formCloseReason,
      close_time: nowStr(), closed_by: '系统管理员', completed_time: nowStr(),
      log_action: '验证通过，关闭工单',
      log_detail: `验证结果：${formVerifyResult || '参数恢复正常'}。${formCloseReason ? `关闭说明：${formCloseReason}` : ''}`,
    })
    message.success(`工单 ${currentWO?.ticket_no} 已关闭`)
  }

  // ========== 操作记录时间线 ==========

  type LogItem = { phase: string; action: string; operator: string; detail?: string; created_at?: string; time?: string }

  const renderLogs = (logs: LogItem[]) => (
    <Timeline
      style={{ marginTop: 8, maxHeight: 200, overflowY: 'auto' }}
      items={logs.map(log => ({
        color: phaseColor[log.phase as WOPhase] || '#999',
        children: (
          <div style={{ fontSize: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600 }}>{log.action}</span>
              <span style={{ color: '#999', fontSize: 11 }}>{log.created_at || log.time}</span>
            </div>
            <div style={{ color: '#666' }}>{log.operator}{log.detail ? ` — ${log.detail}` : ''}</div>
          </div>
        ),
      }))}
    />
  )

  // ========== 表格列 ==========

  const columns = useMemo(() => [
    {
      title: '时间', dataIndex: 'alarmDate', key: 'alarmDate', width: 130,
      render: (text: string) => <span style={{ fontSize: 12, color: text ? '#333' : '#bfbfbf' }}>{text || '-'}</span>,
    },
    {
      title: '井号', dataIndex: 'name', key: 'name', width: 90,
      render: (text: string) => <a style={{ fontWeight: 500 }}>{text}</a>,
    },
    {
      title: '诊断类型', dataIndex: 'diagnosisType', key: 'diagnosisType', width: 90,
      onCell: (r: { status: string }) => ({
        style: { background: statusBgMap[r.status] || '#fff', fontWeight: 500, color: statusColorMap[r.status] || '#333' },
      }),
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 65,
      render: (s: string) => <Tag color={statusColorMap[s]} style={{ margin: 0 }}>{statusTextMap[s]}</Tag>,
    },
    {
      title: '描述', dataIndex: 'description', key: 'description', ellipsis: true,
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
      title: '诊断依据', dataIndex: 'diagnosisBasis', key: 'diagnosisBasis', ellipsis: true,
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
      title: '处理措施', dataIndex: 'treatment', key: 'treatment', ellipsis: true,
      render: (text: string) => <Tooltip title={text}>{text}</Tooltip>,
    },
    {
      title: '泵效', dataIndex: 'efficiency', key: 'efficiency', width: 60,
      render: (val: number) => val ? `${val.toFixed(1)}%` : '-',
    },
    {
      title: '操作', key: 'action', width: 90,
      render: (_: unknown, r: TableRecord) => {
        if (r.status === 'normal' || r.status === 'offline') {
          return <span style={{ color: '#bfbfbf', fontSize: 12 }}>-</span>
        }
        const wo = getWO(r.id)
        if (wo) {
          const p = toWOPhase(wo.status)
          const isClosed = wo.status === 'closed' || wo.status === 'completed' || wo.status === 'cancelled'
          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }} onClick={() => openModal(r)}>
              <Tag color={phaseColor[p]} style={{ margin: 0, fontSize: 11 }}>{phaseLabel[p]}</Tag>
              {isClosed
                ? <EyeOutlined style={{ color: '#999', fontSize: 13 }} />
                : <EditOutlined style={{ color: '#1677ff', fontSize: 13 }} />}
            </div>
          )
        }
        if (r.status === 'alarm') {
          return <Button type="primary" danger size="small" icon={<ToolOutlined />} onClick={() => openModal(r)}>处理</Button>
        }
        if (r.status === 'warning') {
          return <Button type="primary" size="small" icon={<ToolOutlined />} onClick={() => openModal(r)} style={{ background: level2Color, borderColor: level2Color }}>处理</Button>
        }
        return <span style={{ color: '#bfbfbf', fontSize: 12 }}>-</span>
      },
    },
  ], [woCache])

  const mapHeight = Math.max(280, height - 80)

  // ========== 渲染 ==========

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Card
        title={
          <Space>
            <EnvironmentOutlined />
            <span>井位分布</span>
            <Radio.Group size="small" value={filter} onChange={e => setFilter(e.target.value)} optionType="button" buttonStyle="solid">
              <Radio.Button value="all">全部</Radio.Button>
              <Radio.Button value="level1">一级工况</Radio.Button>
              <Radio.Button value="level2">二级工况</Radio.Button>
            </Radio.Group>
          </Space>
        }
        className="chart-card"
        bodyStyle={{ padding: 12 }}
      >
        <ReactECharts option={mapOption} style={{ width: '100%', height: mapHeight - 20 }} />
        <div style={{ padding: '6px 12px', background: '#fafafa', borderRadius: 4, fontSize: 12, marginTop: 8 }}>
          <Space size={16} wrap>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: level1Color, marginRight: 4, verticalAlign: 'middle' }} />一级工况（{level1WellsAll.length}）</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: level2Color, marginRight: 4, verticalAlign: 'middle' }} />二级工况（{level2AbnormalWellsAll.length}）</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: normalColor, marginRight: 4, verticalAlign: 'middle' }} />正常运行（{normalWellsAll.length}）</span>
          </Space>
        </div>
      </Card>

      {middleSlot}

      <Card title={`最近诊断记录 (${tableData.length} 条)`} bodyStyle={{ padding: 0 }}>
        <Table columns={columns} dataSource={tableData} rowKey="id" size="small" pagination={false} scroll={{ y: 400 }} />
      </Card>

      {/* ========== 工单处理弹窗 ========== */}
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={820}
        destroyOnClose
        title={
          currentRecord && currentWO ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {currentRecord.status === 'alarm'
                ? <ExclamationCircleOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                : <WarningOutlined style={{ color: '#fa8c16', fontSize: 18 }} />}
              <span style={{ fontSize: 15, fontWeight: 600 }}>{currentWO.ticket_no || currentWO.id}</span>
              <Tag color={statusColorMap[currentRecord.status]}>{statusTextMap[currentRecord.status]}</Tag>
              <Tag>{currentRecord.diagnosisType}</Tag>
              <span style={{ fontSize: 13, color: '#999' }}>{currentRecord.name}</span>
              <Badge color={phaseColor[currentPhase]} text={<span style={{ fontSize: 12, color: phaseColor[currentPhase], fontWeight: 600 }}>{phaseLabel[currentPhase]}</span>} style={{ marginLeft: 'auto' }} />
            </div>
          ) : null
        }
      >
        {currentRecord && currentWO && (
          <div>
            <Steps
              current={phaseIndex[currentPhase]}
              size="small"
              style={{ marginBottom: 20 }}
              items={[
                { title: '发现问题', icon: <FileSearchOutlined /> },
                { title: '分析问题', icon: <AuditOutlined /> },
                { title: '执行处理', icon: <SolutionOutlined /> },
                { title: '验证结果', icon: <SafetyCertificateOutlined /> },
                { title: '问题关闭', icon: <FileDoneOutlined /> },
              ]}
            />

            {/* ===== 发现问题 ===== */}
            {currentPhase === 'discovered' && (
              <>
                <Descriptions bordered size="small" column={4}
                  labelStyle={{ background: '#fafafa', fontWeight: 500, fontSize: 12, padding: '6px 10px' }}
                  contentStyle={{ fontSize: 12, padding: '6px 10px' }}
                >
                  <Descriptions.Item label="井号">{currentRecord.name}</Descriptions.Item>
                  <Descriptions.Item label="油田/区块">{currentRecord.oilField} / {currentRecord.block}</Descriptions.Item>
                  <Descriptions.Item label="泵型号">{currentRecord.pumpModel}</Descriptions.Item>
                  <Descriptions.Item label="运行天数">{currentRecord.runDays}天</Descriptions.Item>
                  <Descriptions.Item label="频率"><span style={{ color: currentRecord.status === 'alarm' ? '#ff4d4f' : '#fa8c16', fontWeight: 600 }}>{currentRecord.frequency} Hz</span></Descriptions.Item>
                  <Descriptions.Item label="电流">{currentRecord.current} A</Descriptions.Item>
                  <Descriptions.Item label="电压">{currentRecord.voltage} V</Descriptions.Item>
                  <Descriptions.Item label="功率">{currentRecord.power} kW</Descriptions.Item>
                  <Descriptions.Item label="日产液">{currentRecord.dailyLiquid} t/d</Descriptions.Item>
                  <Descriptions.Item label="日产油">{currentRecord.dailyOil} t/d</Descriptions.Item>
                  <Descriptions.Item label="含水率">{currentRecord.waterCut}%</Descriptions.Item>
                  <Descriptions.Item label="泵效"><span style={{ color: currentRecord.efficiency < 25 ? '#ff4d4f' : currentRecord.efficiency < 35 ? '#fa8c16' : '#52c41a', fontWeight: 600 }}>{currentRecord.efficiency}%</span></Descriptions.Item>
                  <Descriptions.Item label="电机温度"><span style={{ color: currentRecord.temperature > 100 ? '#ff4d4f' : '#333' }}>{currentRecord.temperature}℃</span></Descriptions.Item>
                  <Descriptions.Item label="振动"><span style={{ color: currentRecord.vibration > 5 ? '#ff4d4f' : '#333' }}>{currentRecord.vibration} mm/s</span></Descriptions.Item>
                  <Descriptions.Item label="沉没度">{currentRecord.submergence} m</Descriptions.Item>
                  <Descriptions.Item label="动液面">{currentRecord.dynamicLevel} m</Descriptions.Item>
                </Descriptions>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ background: currentRecord.status === 'alarm' ? '#fff1f0' : '#fffbe6', borderLeft: `3px solid ${currentRecord.status === 'alarm' ? '#ff4d4f' : '#faad14'}`, borderRadius: 6, padding: '10px 14px', fontSize: 13, lineHeight: 1.8 }}>
                  <div><strong>工况类型：</strong>{currentRecord.diagnosisType}（{currentRecord.workConditionCode}）</div>
                  <div><strong>异常描述：</strong>{currentRecord.description}</div>
                  <div><strong>诊断依据：</strong>{currentRecord.diagnosisBasis}</div>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}><ClockCircleOutlined style={{ marginRight: 4 }} />操作记录</div>
                {renderLogs((currentWO?.logs || []))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <Button onClick={() => setModalVisible(false)}>关闭</Button>
                  <Button type="primary" icon={<AuditOutlined />} onClick={advanceToAnalyzing}>确认问题，进入分析</Button>
                </div>
              </>
            )}

            {/* ===== 分析问题 ===== */}
            {currentPhase === 'analyzing' && (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, fontSize: 14, fontWeight: 600, color: '#1677ff' }}>
                    <AlertOutlined /> 诊断分析
                  </div>
                  {conditionDetail && (
                    <div style={{ background: '#f6f8fa', borderLeft: '3px solid #1677ff', borderRadius: 6, padding: '10px 14px', fontSize: 13, lineHeight: 1.8 }}>
                      <div><strong>机理分析：</strong>{conditionDetail.mechanism}</div>
                    </div>
                  )}
                </div>
                {conditionDetail && conditionDetail.features.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fa8c16', marginBottom: 6 }}><SafetyCertificateOutlined style={{ marginRight: 4 }} />诊断特征匹配</div>
                    <Timeline style={{ marginTop: 8 }}
                      items={conditionDetail.features.map((f, i) => ({
                        color: i < 2 ? (currentRecord.status === 'alarm' ? 'red' : 'orange') : 'gray',
                        children: <span style={{ fontSize: 12 }}>{f}</span>,
                      }))}
                    />
                  </div>
                )}
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#52c41a', marginBottom: 8 }}><ToolOutlined style={{ marginRight: 4 }} />推荐处理方案</div>
                  {conditionDetail && (
                    <Timeline style={{ marginBottom: 0 }}
                      items={conditionDetail.suggestions.map((s, i) => ({
                        color: 'green',
                        children: <span style={{ fontSize: 12 }}>{i + 1}. {s}</span>,
                      }))}
                    />
                  )}
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ fontSize: 14, fontWeight: 600, color: '#1677ff', marginBottom: 10 }}><SendOutlined style={{ marginRight: 4 }} />制定处理工单</div>
                <div style={{ display: 'flex', gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>优先级</div>
                    <Select value={formPriority} onChange={setFormPriority} style={{ width: '100%' }} size="small"
                      options={[
                        { value: 'urgent', label: '紧急（2小时内响应）' },
                        { value: 'high', label: '高（4小时内响应）' },
                        { value: 'medium', label: '中（24小时内响应）' },
                        { value: 'low', label: '低（48小时内响应）' },
                      ]}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>指派班组</div>
                    <Select value={formTeam} onChange={setFormTeam} style={{ width: '100%' }} size="small"
                      options={[
                        { value: 'team1', label: '采油一班' },
                        { value: 'team2', label: '采油二班' },
                        { value: 'team3', label: '维修班' },
                        { value: 'team4', label: '作业队' },
                      ]}
                    />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>处理备注</div>
                <Input.TextArea value={formRemark} onChange={e => setFormRemark(e.target.value)}
                  placeholder={`${currentRecord.name} ${currentRecord.diagnosisType}，建议${conditionDetail?.suggestions[0] || '立即处理'}`}
                  rows={2} style={{ fontSize: 12 }}
                />
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}><ClockCircleOutlined style={{ marginRight: 4 }} />操作记录</div>
                {renderLogs((currentWO?.logs || []))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <Button onClick={() => setModalVisible(false)}>暂存关闭</Button>
                  <Button type="primary" loading={submitting} icon={<SendOutlined />} onClick={advanceToExecuting}>下发工单，开始执行</Button>
                </div>
              </>
            )}

            {/* ===== 执行处理 ===== */}
            {currentPhase === 'executing' && (
              <>
                <Descriptions bordered size="small" column={3}
                  labelStyle={{ background: '#fafafa', fontWeight: 500, fontSize: 12, padding: '6px 8px' }}
                  contentStyle={{ fontSize: 12, padding: '6px 8px' }}
                >
                  <Descriptions.Item label="工单号">{currentWO.ticket_no || currentWO.id}</Descriptions.Item>
                  <Descriptions.Item label="优先级">
                    <Tag color={currentWO.priority === 'urgent' ? 'red' : currentWO.priority === 'high' ? 'orange' : currentWO.priority === 'medium' ? 'gold' : 'green'}>
                      {currentWO.priority === 'urgent' ? '紧急' : currentWO.priority === 'high' ? '高' : currentWO.priority === 'medium' ? '中' : '低'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="指派班组">{currentWO?.assigned_team === 'team1' ? '采油一班' : currentWO?.assigned_team === 'team2' ? '采油二班' : currentWO?.assigned_team === 'team3' ? '维修班' : currentWO?.assigned_team || '作业队'}</Descriptions.Item>
                </Descriptions>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#333', marginBottom: 10 }}><ThunderboltOutlined style={{ marginRight: 4, color: '#fa8c16' }} />现场操作指令</div>
                  <Space wrap>
                    {quickActions.map((act, i) => (
                      <Button key={i} icon={act.icon} style={{ borderColor: act.color, color: act.color }} onClick={() => handleQuickAction(act.label)}>
                        {act.label}
                      </Button>
                    ))}
                  </Space>
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}><ClockCircleOutlined style={{ marginRight: 4 }} />操作记录</div>
                {renderLogs((currentWO?.logs || []))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <Button onClick={() => setModalVisible(false)}>暂存关闭</Button>
                  <Button type="primary" icon={<SafetyCertificateOutlined />} onClick={advanceToVerifying}>处理完成，进入验证</Button>
                </div>
              </>
            )}

            {/* ===== 验证结果 ===== */}
            {currentPhase === 'verifying' && (
              <>
                <div style={{ background: '#f0f5ff', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#722ed1', marginBottom: 10 }}><SafetyCertificateOutlined style={{ marginRight: 4 }} />验证运行参数</div>
                  <Descriptions bordered size="small" column={4}
                    labelStyle={{ background: '#fafafa', fontWeight: 500, fontSize: 12, padding: '5px 8px' }}
                    contentStyle={{ fontSize: 12, padding: '5px 8px' }}
                  >
                    <Descriptions.Item label="频率">{currentRecord.frequency} Hz</Descriptions.Item>
                    <Descriptions.Item label="电流">{currentRecord.current} A</Descriptions.Item>
                    <Descriptions.Item label="日产液">{currentRecord.dailyLiquid} t/d</Descriptions.Item>
                    <Descriptions.Item label="泵效">{currentRecord.efficiency}%</Descriptions.Item>
                    <Descriptions.Item label="温度">{currentRecord.temperature}℃</Descriptions.Item>
                    <Descriptions.Item label="振动">{currentRecord.vibration} mm/s</Descriptions.Item>
                    <Descriptions.Item label="沉没度">{currentRecord.submergence} m</Descriptions.Item>
                    <Descriptions.Item label="动液面">{currentRecord.dynamicLevel} m</Descriptions.Item>
                  </Descriptions>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>验证结果</div>
                  <Select value={formVerifyResult} onChange={setFormVerifyResult} style={{ width: '100%' }} size="small" placeholder="请选择验证结果"
                    options={[
                      { value: '参数恢复正常，工况消除', label: '参数恢复正常，工况消除' },
                      { value: '参数改善明显，持续观察', label: '参数改善明显，持续观察' },
                      { value: '参数部分恢复，需后续跟踪', label: '参数部分恢复，需后续跟踪' },
                    ]}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>关闭说明</div>
                  <Input.TextArea value={formCloseReason} onChange={e => setFormCloseReason(e.target.value)}
                    placeholder="请输入关闭说明（如：经48小时观察，各项参数恢复正常区间）"
                    rows={2} style={{ fontSize: 12 }}
                  />
                </div>
                <Divider style={{ margin: '12px 0' }} />
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}><ClockCircleOutlined style={{ marginRight: 4 }} />操作记录</div>
                {renderLogs((currentWO?.logs || []))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                  <Button icon={<ReloadOutlined />} onClick={() => doAdvance({ status: 'executing', log_action: '验证未通过，退回执行', log_detail: '参数未恢复，需继续处理' })}>
                    退回执行
                  </Button>
                  <Button onClick={() => setModalVisible(false)}>暂存关闭</Button>
                  <Button type="primary" loading={submitting} icon={<FileDoneOutlined />} onClick={advanceToClosed} disabled={!formVerifyResult}>
                    验证通过，关闭工单
                  </Button>
                </div>
              </>
            )}

            {/* ===== 已关闭 ===== */}
            {currentPhase === 'closed' && (
              <>
                <div style={{ textAlign: 'center', padding: '20px 0 16px' }}>
                  <CheckCircleOutlined style={{ fontSize: 48, color: '#52c41a', marginBottom: 12 }} />
                  <div style={{ fontSize: 16, fontWeight: 600, color: '#333', marginBottom: 4 }}>工单已关闭</div>
                  <div style={{ fontSize: 13, color: '#666' }}>{currentWO?.verify_result || '处理完成'}</div>
                </div>
                <Descriptions bordered size="small" column={2}
                  labelStyle={{ background: '#fafafa', fontWeight: 500, fontSize: 12, padding: '6px 10px' }}
                  contentStyle={{ fontSize: 12, padding: '6px 10px' }}
                >
                  <Descriptions.Item label="工单号">{currentWO.ticket_no || currentWO.id}</Descriptions.Item>
                  <Descriptions.Item label="井号">{currentWO?.well_name}</Descriptions.Item>
                  <Descriptions.Item label="工况类型">{currentWO.diagnosis_type}</Descriptions.Item>
                  <Descriptions.Item label="优先级">
                    <Tag color={currentWO.priority === 'urgent' ? 'red' : currentWO.priority === 'high' ? 'orange' : currentWO.priority === 'medium' ? 'gold' : 'green'}>
                      {currentWO.priority === 'urgent' ? '紧急' : currentWO.priority === 'high' ? '高' : currentWO.priority === 'medium' ? '中' : '低'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">{currentWO?.created_at}</Descriptions.Item>
                  <Descriptions.Item label="关闭时间">{currentWO?.close_time || (currentWO?.logs || [])[(currentWO?.logs || []).length - 1]?.created_at}</Descriptions.Item>
                  <Descriptions.Item label="验证结果" span={2}>{currentWO?.verify_result}</Descriptions.Item>
                  {currentWO?.close_reason && <Descriptions.Item label="关闭说明" span={2}>{currentWO?.close_reason}</Descriptions.Item>}
                </Descriptions>
                <Divider style={{ margin: '14px 0' }} />
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}><ClockCircleOutlined style={{ marginRight: 4 }} />完整操作记录（{(currentWO?.logs || []).length} 条）</div>
                {renderLogs((currentWO?.logs || []))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <Button type="primary" onClick={() => setModalVisible(false)}>关闭</Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default GISWellMap
