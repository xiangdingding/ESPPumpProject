import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Card, Table, Tag, Button, Space, Select, Input, Modal, Timeline,
  Descriptions, Divider, Steps, DatePicker, Spin, message, Badge, Statistic,
} from 'antd'
import {
  EyeOutlined, ToolOutlined, SearchOutlined, AlertOutlined,
  ExperimentOutlined, BulbOutlined, RocketOutlined, SafetyCertificateOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ClockCircleOutlined,
  FileTextOutlined, UserOutlined, TeamOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import {
  fetchWorkOrders, fetchWorkOrderStats, advanceWorkOrder, addWorkOrderLog,
  type WorkOrderDTO, type WorkOrderLog,
} from '../../api/workOrderApi'

const { RangePicker } = DatePicker

/* ───────── config maps ───────── */

type StatusKey =
  | 'discovered' | 'analyzing' | 'solution_proposed' | 'pending_approval'
  | 'executing' | 'verifying' | 'completed' | 'closed' | 'cancelled'

const statusConfig: Record<StatusKey, { color: string; text: string; step: number; icon: React.ReactNode }> = {
  discovered:         { color: 'red',     text: '发现问题', step: 0, icon: <AlertOutlined /> },
  analyzing:          { color: 'orange',  text: '分析中',   step: 1, icon: <ExperimentOutlined /> },
  solution_proposed:  { color: 'gold',    text: '已提方案', step: 2, icon: <BulbOutlined /> },
  pending_approval:   { color: 'purple',  text: '待审批',   step: 3, icon: <FileTextOutlined /> },
  executing:          { color: 'blue',    text: '执行中',   step: 4, icon: <RocketOutlined /> },
  verifying:          { color: '#722ed1', text: '验证中',   step: 5, icon: <SafetyCertificateOutlined /> },
  completed:          { color: 'green',   text: '已完成',   step: 6, icon: <CheckCircleOutlined /> },
  closed:             { color: '#999',    text: '已关闭',   step: 7, icon: <CloseCircleOutlined /> },
  cancelled:          { color: '#999',    text: '已取消',   step: -1, icon: <CloseCircleOutlined /> },
}

const statusFlow: StatusKey[] = [
  'discovered', 'analyzing', 'solution_proposed', 'executing', 'verifying', 'completed', 'closed',
]

type SeverityKey = 'urgent' | 'high' | 'medium' | 'low'

const severityConfig: Record<SeverityKey, { color: string; text: string }> = {
  urgent: { color: 'red',    text: '紧急' },
  high:   { color: 'orange', text: '高' },
  medium: { color: 'blue',   text: '中' },
  low:    { color: 'default', text: '低' },
}

const nextStatusMap: Record<string, StatusKey> = {
  discovered: 'analyzing',
  analyzing: 'solution_proposed',
  solution_proposed: 'executing',
  executing: 'verifying',
  verifying: 'completed',
}

const phaseLabels: Record<string, string> = {
  discovered: '确认问题',
  analyzing: '提交分析方案',
  solution_proposed: '分配执行',
  executing: '提交验证结果',
  verifying: '完成/关闭',
}

/* ───────── helpers ───────── */

function getStatusConf(s: string) {
  return statusConfig[s as StatusKey] ?? { color: 'default', text: s, step: -1, icon: <ClockCircleOutlined /> }
}
function getSeverityConf(s: string) {
  return severityConfig[s as SeverityKey] ?? { color: 'default', text: s }
}

/* ───────── component ───────── */

const WorkOrderList: React.FC = () => {
  const [orders, setOrders] = useState<WorkOrderDTO[]>([])
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [apiFailed, setApiFailed] = useState(false)

  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [keyword, setKeyword] = useState('')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)

  const [detailVisible, setDetailVisible] = useState(false)
  const [processVisible, setProcessVisible] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderDTO | null>(null)
  const [processing, setProcessing] = useState(false)

  // process-modal form fields
  const [formAnalyzer, setFormAnalyzer] = useState('')
  const [formSolution, setFormSolution] = useState('')
  const [formSteps, setFormSteps] = useState('')
  const [formCost, setFormCost] = useState('')
  const [formTeam, setFormTeam] = useState('')
  const [formExecutor, setFormExecutor] = useState('')
  const [formPriority, setFormPriority] = useState('medium')
  const [formVerifyResult, setFormVerifyResult] = useState('')
  const [formCloseReason, setFormCloseReason] = useState('')

  /* ── data loading ── */

  const loadData = useCallback(async () => {
    setLoading(true)
    setApiFailed(false)
    try {
      const [list, st] = await Promise.all([fetchWorkOrders(), fetchWorkOrderStats()])
      setOrders(list)
      setStats(st)
    } catch {
      setApiFailed(true)
      setOrders([])
      setStats({})
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  /* ── filtering ── */

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false
      if (severityFilter !== 'all' && o.severity !== severityFilter) return false
      if (keyword) {
        const kw = keyword.toLowerCase()
        const match =
          o.well_name?.toLowerCase().includes(kw) ||
          o.ticket_no?.toLowerCase().includes(kw) ||
          o.problem_desc?.toLowerCase().includes(kw) ||
          o.well_id?.toLowerCase().includes(kw)
        if (!match) return false
      }
      if (dateRange && dateRange[0] && dateRange[1]) {
        const d = dayjs(o.discovered_time)
        if (d.isBefore(dateRange[0], 'day') || d.isAfter(dateRange[1], 'day')) return false
      }
      return true
    })
  }, [orders, statusFilter, severityFilter, keyword, dateRange])

  /* ── stats cards ── */

  const statCards: { key: StatusKey; label: string; color: string; icon: React.ReactNode }[] = [
    { key: 'discovered',        label: '发现问题', color: '#ff4d4f',  icon: <AlertOutlined /> },
    { key: 'analyzing',         label: '分析中',   color: '#fa8c16',  icon: <ExperimentOutlined /> },
    { key: 'solution_proposed', label: '已提方案', color: '#faad14',  icon: <BulbOutlined /> },
    { key: 'executing',         label: '执行中',   color: '#1677ff',  icon: <RocketOutlined /> },
    { key: 'verifying',         label: '验证中',   color: '#722ed1',  icon: <SafetyCertificateOutlined /> },
    { key: 'completed',         label: '已完成',   color: '#52c41a',  icon: <CheckCircleOutlined /> },
    { key: 'closed',            label: '已关闭',   color: '#999',     icon: <CloseCircleOutlined /> },
  ]

  /* ── process modal helpers ── */

  const resetProcessForm = () => {
    setFormAnalyzer(''); setFormSolution(''); setFormSteps(''); setFormCost('')
    setFormTeam(''); setFormExecutor(''); setFormPriority('medium')
    setFormVerifyResult(''); setFormCloseReason('')
  }

  const openProcess = (order: WorkOrderDTO) => {
    resetProcessForm()
    setSelectedOrder(order)
    setProcessVisible(true)
  }

  const handleAdvance = async () => {
    if (!selectedOrder) return
    const status = selectedOrder.status as StatusKey
    const next = nextStatusMap[status]
    if (!next) return

    const data: Record<string, unknown> = { status: next }
    let logAction = ''
    let logDetail = ''

    switch (status) {
      case 'discovered':
        if (!formAnalyzer.trim()) { message.warning('请填写分析人'); return }
        data.analyzer = formAnalyzer.trim()
        data.analyze_time = dayjs().format('YYYY-MM-DD HH:mm:ss')
        logAction = '确认问题并分配分析'
        logDetail = `分析人: ${formAnalyzer.trim()}`
        break
      case 'analyzing':
        if (!formSolution.trim()) { message.warning('请填写解决方案'); return }
        data.solution = formSolution.trim()
        data.solution_steps = formSteps.split('\n').filter(Boolean)
        data.estimated_cost = formCost ? Number(formCost) : 0
        data.solution_time = dayjs().format('YYYY-MM-DD HH:mm:ss')
        data.solution_by = selectedOrder.analyzer
        logAction = '提交解决方案'
        logDetail = `方案: ${formSolution.trim()}`
        break
      case 'solution_proposed':
        if (!formExecutor.trim()) { message.warning('请填写执行人'); return }
        data.assigned_team = formTeam.trim()
        data.executor = formExecutor.trim()
        data.priority = formPriority
        data.execute_time = dayjs().format('YYYY-MM-DD HH:mm:ss')
        logAction = '分配执行任务'
        logDetail = `执行人: ${formExecutor.trim()}, 团队: ${formTeam.trim()}`
        break
      case 'executing':
        if (!formVerifyResult.trim()) { message.warning('请填写验证结果'); return }
        data.verify_result = formVerifyResult.trim()
        data.verify_time = dayjs().format('YYYY-MM-DD HH:mm:ss')
        data.verify_by = selectedOrder.executor
        logAction = '提交验证结果'
        logDetail = `验证结果: ${formVerifyResult.trim()}`
        break
      case 'verifying':
        if (!formCloseReason.trim()) { message.warning('请填写关闭原因'); return }
        data.status = 'completed'
        data.completed_time = dayjs().format('YYYY-MM-DD HH:mm:ss')
        data.close_reason = formCloseReason.trim()
        data.close_time = dayjs().format('YYYY-MM-DD HH:mm:ss')
        data.closed_by = selectedOrder.verify_by || '系统'
        logAction = '完成并关闭'
        logDetail = `关闭原因: ${formCloseReason.trim()}`
        break
      default:
        return
    }

    setProcessing(true)
    try {
      await advanceWorkOrder(selectedOrder.id, data)
      await addWorkOrderLog(selectedOrder.id, next, logAction, '当前用户', logDetail)
      message.success('工单处理成功')
      setProcessVisible(false)
      loadData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '操作失败'
      message.error(msg)
    } finally {
      setProcessing(false)
    }
  }

  /* ── table columns ── */

  const columns: ColumnsType<WorkOrderDTO> = [
    {
      title: '工单编号',
      dataIndex: 'ticket_no',
      key: 'ticket_no',
      width: 170,
      fixed: 'left',
      render: (text: string) => <span style={{ fontWeight: 500, color: '#1677ff' }}>{text}</span>,
    },
    {
      title: '井号',
      dataIndex: 'well_name',
      key: 'well_name',
      width: 130,
      render: (_: unknown, record: WorkOrderDTO) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.well_name}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{record.oil_field} · {record.block_name}</div>
        </div>
      ),
    },
    {
      title: '诊断类型',
      dataIndex: 'diagnosis_type',
      key: 'diagnosis_type',
      width: 110,
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 90,
      render: (s: string) => {
        const c = getSeverityConf(s)
        return <Tag color={c.color}>{c.text}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (s: string) => {
        const c = getStatusConf(s)
        return <Tag color={c.color}>{c.text}</Tag>
      },
    },
    {
      title: '发现时间',
      dataIndex: 'discovered_time',
      key: 'discovered_time',
      width: 160,
      render: (t: string) => t ? dayjs(t).format('YYYY-MM-DD HH:mm') : '-',
    },
    {
      title: '发现人',
      dataIndex: 'discovered_by',
      key: 'discovered_by',
      width: 100,
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_: unknown, record: WorkOrderDTO) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => { setSelectedOrder(record); setDetailVisible(true) }}
          >
            详情
          </Button>
          {record.status !== 'completed' && record.status !== 'closed' && record.status !== 'cancelled' && (
            <Button
              type="link"
              size="small"
              icon={<ToolOutlined />}
              onClick={() => openProcess(record)}
            >
              处理
            </Button>
          )}
        </Space>
      ),
    },
  ]

  /* ── detail modal ── */

  const renderDetailModal = () => {
    if (!selectedOrder) return null
    const o = selectedOrder
    const sc = getStatusConf(o.status)
    const currentStep = sc.step

    const flowItems = statusFlow.map(key => {
      const cfg = statusConfig[key]
      const done = currentStep >= cfg.step
      let timeStr = ''
      let operatorStr = ''
      switch (key) {
        case 'discovered':        timeStr = o.discovered_time; operatorStr = o.discovered_by; break
        case 'analyzing':         timeStr = o.analyze_time; operatorStr = o.analyzer; break
        case 'solution_proposed': timeStr = o.solution_time; operatorStr = o.solution_by; break
        case 'executing':         timeStr = o.execute_time; operatorStr = o.executor; break
        case 'verifying':         timeStr = o.verify_time; operatorStr = o.verify_by; break
        case 'completed':         timeStr = o.completed_time; operatorStr = o.closed_by; break
        case 'closed':            timeStr = o.close_time; operatorStr = o.closed_by; break
      }
      return {
        color: done ? 'green' : 'gray',
        children: (
          <>
            <strong>{cfg.text}</strong><br />
            <span style={{ color: '#888', fontSize: 12 }}>{timeStr || '—'}</span><br />
            {operatorStr && <span style={{ color: '#888', fontSize: 12 }}>{operatorStr}</span>}
          </>
        ),
      }
    })

    const logItems = (o.logs ?? []).map(log => ({
      color: 'blue' as const,
      children: (
        <div key={log.id}>
          <strong>{log.action}</strong>
          <span style={{ color: '#888', fontSize: 12, marginLeft: 8 }}>{log.phase}</span>
          <br />
          <span style={{ fontSize: 12, color: '#666' }}>{log.detail}</span>
          <br />
          <span style={{ fontSize: 12, color: '#999' }}>
            <UserOutlined style={{ marginRight: 4 }} />{log.operator}
            <span style={{ marginLeft: 12 }}>{dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss')}</span>
          </span>
        </div>
      ),
    }))

    return (
      <Modal
        title={<><FileTextOutlined style={{ marginRight: 8 }} />工单详情 — {o.ticket_no}</>}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={1000}
        footer={<Button onClick={() => setDetailVisible(false)}>关闭</Button>}
      >
        <div style={{ display: 'flex', gap: 24 }}>
          {/* left */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <Descriptions title="基本信息" column={2} bordered size="small">
              <Descriptions.Item label="工单编号">{o.ticket_no}</Descriptions.Item>
              <Descriptions.Item label="井号">{o.well_name}</Descriptions.Item>
              <Descriptions.Item label="油田">{o.oil_field}</Descriptions.Item>
              <Descriptions.Item label="区块">{o.block_name}</Descriptions.Item>
              <Descriptions.Item label="诊断类型">{o.diagnosis_type}</Descriptions.Item>
              <Descriptions.Item label="严重程度">
                <Tag color={getSeverityConf(o.severity).color}>{getSeverityConf(o.severity).text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={sc.color}>{sc.text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">{o.priority || '-'}</Descriptions.Item>
            </Descriptions>

            <Divider style={{ margin: '12px 0' }} />
            <Descriptions title="问题描述" column={1} bordered size="small">
              <Descriptions.Item label="问题类型">{o.problem_type}</Descriptions.Item>
              <Descriptions.Item label="问题描述">{o.problem_desc || '-'}</Descriptions.Item>
              <Descriptions.Item label="发现时间">{o.discovered_time || '-'}</Descriptions.Item>
              <Descriptions.Item label="发现人">{o.discovered_by || '-'}</Descriptions.Item>
            </Descriptions>

            {o.analyzer && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Descriptions title="诊断分析" column={2} bordered size="small">
                  <Descriptions.Item label="分析人">{o.analyzer}</Descriptions.Item>
                  <Descriptions.Item label="分析时间">{o.analyze_time || '-'}</Descriptions.Item>
                  <Descriptions.Item label="工况代码" span={2}>{o.condition_code || '-'}</Descriptions.Item>
                </Descriptions>
              </>
            )}

            {o.solution && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Descriptions title="解决方案" column={1} bordered size="small">
                  <Descriptions.Item label="解决方案">{o.solution}</Descriptions.Item>
                  {o.solution_steps?.length > 0 && (
                    <Descriptions.Item label="解决步骤">
                      <ol style={{ margin: 0, paddingLeft: 20 }}>
                        {o.solution_steps.map((s, i) => <li key={i}>{s}</li>)}
                      </ol>
                    </Descriptions.Item>
                  )}
                  <Descriptions.Item label="方案提出人">{o.solution_by || '-'}</Descriptions.Item>
                  <Descriptions.Item label="方案时间">{o.solution_time || '-'}</Descriptions.Item>
                  {o.estimated_cost != null && (
                    <Descriptions.Item label="预估成本">¥{o.estimated_cost.toLocaleString()}</Descriptions.Item>
                  )}
                </Descriptions>
              </>
            )}

            {(o.verify_result || o.execute_time) && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Descriptions title="执行与验证" column={2} bordered size="small">
                  <Descriptions.Item label="执行人">{o.executor || '-'}</Descriptions.Item>
                  <Descriptions.Item label="执行团队">{o.assigned_team || '-'}</Descriptions.Item>
                  <Descriptions.Item label="执行时间">{o.execute_time || '-'}</Descriptions.Item>
                  <Descriptions.Item label="验证时间">{o.verify_time || '-'}</Descriptions.Item>
                  <Descriptions.Item label="验证结果" span={2}>{o.verify_result || '-'}</Descriptions.Item>
                  <Descriptions.Item label="验证人">{o.verify_by || '-'}</Descriptions.Item>
                  {o.actual_cost != null && (
                    <Descriptions.Item label="实际成本">¥{o.actual_cost.toLocaleString()}</Descriptions.Item>
                  )}
                </Descriptions>
              </>
            )}

            {(o.close_time || o.close_reason) && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Descriptions title="关闭信息" column={2} bordered size="small">
                  <Descriptions.Item label="完成时间">{o.completed_time || '-'}</Descriptions.Item>
                  <Descriptions.Item label="关闭时间">{o.close_time || '-'}</Descriptions.Item>
                  <Descriptions.Item label="关闭人">{o.closed_by || '-'}</Descriptions.Item>
                  <Descriptions.Item label="关闭原因" span={2}>{o.close_reason || '-'}</Descriptions.Item>
                </Descriptions>
              </>
            )}

            {o.remark && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Descriptions title="备注" column={1} bordered size="small">
                  <Descriptions.Item label="备注">{o.remark}</Descriptions.Item>
                </Descriptions>
              </>
            )}
          </div>

          {/* right: flow timeline */}
          <div style={{ width: 260, flexShrink: 0, borderLeft: '1px solid #f0f0f0', paddingLeft: 24 }}>
            <h4 style={{ marginBottom: 16 }}>处理流程</h4>
            <Timeline items={flowItems} />
          </div>
        </div>

        {/* bottom: full operation log */}
        {logItems.length > 0 && (
          <>
            <Divider style={{ margin: '16px 0 12px' }} />
            <h4 style={{ marginBottom: 12 }}>操作日志</h4>
            <div style={{ maxHeight: 260, overflowY: 'auto' }}>
              <Timeline items={logItems} />
            </div>
          </>
        )}
      </Modal>
    )
  }

  /* ── process modal ── */

  const renderProcessModal = () => {
    if (!selectedOrder) return null
    const o = selectedOrder
    const status = o.status as StatusKey
    const label = phaseLabels[status] || '处理'

    const stepIndex = (() => {
      switch (status) {
        case 'discovered': return 0
        case 'analyzing': return 1
        case 'solution_proposed': return 2
        case 'executing': return 3
        case 'verifying': return 4
        default: return 0
      }
    })()

    return (
      <Modal
        title={<><ToolOutlined style={{ marginRight: 8 }} />工单处理 — {o.ticket_no}</>}
        open={processVisible}
        onCancel={() => setProcessVisible(false)}
        width={640}
        confirmLoading={processing}
        onOk={handleAdvance}
        okText="提交"
        cancelText="取消"
      >
        <Steps
          current={stepIndex}
          size="small"
          style={{ marginBottom: 24 }}
          items={[
            { title: '确认问题' },
            { title: '分析方案' },
            { title: '分配执行' },
            { title: '验证结果' },
            { title: '完成关闭' },
          ]}
        />

        <div style={{ padding: '0 8px' }}>
          <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="工单编号">{o.ticket_no}</Descriptions.Item>
            <Descriptions.Item label="井号">{o.well_name}</Descriptions.Item>
            <Descriptions.Item label="当前状态">
              <Tag color={getStatusConf(o.status).color}>{getStatusConf(o.status).text}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="下一步">
              <Tag color={getStatusConf(nextStatusMap[status] ?? 'completed').color}>
                {getStatusConf(nextStatusMap[status] ?? 'completed').text}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          <Divider style={{ margin: '12px 0' }}>{label}</Divider>

          {status === 'discovered' && (
            <div>
              <div style={{ marginBottom: 8 }}>
                <label>分析人 <span style={{ color: 'red' }}>*</span></label>
              </div>
              <Input
                prefix={<UserOutlined />}
                placeholder="请输入分析人姓名"
                value={formAnalyzer}
                onChange={e => setFormAnalyzer(e.target.value)}
              />
            </div>
          )}

          {status === 'analyzing' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ marginBottom: 4 }}>解决方案 <span style={{ color: 'red' }}>*</span></div>
                <Input.TextArea
                  rows={3}
                  placeholder="请输入解决方案"
                  value={formSolution}
                  onChange={e => setFormSolution(e.target.value)}
                />
              </div>
              <div>
                <div style={{ marginBottom: 4 }}>解决步骤（每行一步）</div>
                <Input.TextArea
                  rows={3}
                  placeholder="步骤1&#10;步骤2&#10;步骤3"
                  value={formSteps}
                  onChange={e => setFormSteps(e.target.value)}
                />
              </div>
              <div>
                <div style={{ marginBottom: 4 }}>预估成本（元）</div>
                <Input
                  type="number"
                  placeholder="0"
                  value={formCost}
                  onChange={e => setFormCost(e.target.value)}
                />
              </div>
            </div>
          )}

          {status === 'solution_proposed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <div style={{ marginBottom: 4 }}>执行团队</div>
                <Input
                  prefix={<TeamOutlined />}
                  placeholder="请输入执行团队"
                  value={formTeam}
                  onChange={e => setFormTeam(e.target.value)}
                />
              </div>
              <div>
                <div style={{ marginBottom: 4 }}>执行人 <span style={{ color: 'red' }}>*</span></div>
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入执行人姓名"
                  value={formExecutor}
                  onChange={e => setFormExecutor(e.target.value)}
                />
              </div>
              <div>
                <div style={{ marginBottom: 4 }}>优先级</div>
                <Select value={formPriority} onChange={setFormPriority} style={{ width: '100%' }}>
                  <Select.Option value="urgent">紧急</Select.Option>
                  <Select.Option value="high">高</Select.Option>
                  <Select.Option value="medium">中</Select.Option>
                  <Select.Option value="low">低</Select.Option>
                </Select>
              </div>
            </div>
          )}

          {status === 'executing' && (
            <div>
              <div style={{ marginBottom: 4 }}>验证结果 <span style={{ color: 'red' }}>*</span></div>
              <Input.TextArea
                rows={4}
                placeholder="请输入验证结果"
                value={formVerifyResult}
                onChange={e => setFormVerifyResult(e.target.value)}
              />
            </div>
          )}

          {status === 'verifying' && (
            <div>
              <div style={{ marginBottom: 4 }}>关闭原因 <span style={{ color: 'red' }}>*</span></div>
              <Input.TextArea
                rows={4}
                placeholder="请输入关闭原因"
                value={formCloseReason}
                onChange={e => setFormCloseReason(e.target.value)}
              />
            </div>
          )}
        </div>
      </Modal>
    )
  }

  /* ── render ── */

  return (
    <div style={{ padding: 16 }}>
      {/* stats bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {statCards.map(c => {
          const count = stats[c.key] ?? 0
          const active = statusFilter === c.key
          return (
            <Card
              key={c.key}
              size="small"
              hoverable
              style={{
                flex: '1 1 120px',
                minWidth: 120,
                cursor: 'pointer',
                borderColor: active ? c.color : undefined,
                borderWidth: active ? 2 : 1,
              }}
              onClick={() => setStatusFilter(active ? 'all' : c.key)}
            >
              <Statistic
                title={<span style={{ fontSize: 12 }}>{c.label}</span>}
                value={count}
                valueStyle={{ color: c.color, fontSize: 22, fontWeight: 600 }}
                prefix={<Badge color={c.color} />}
              />
            </Card>
          )
        })}
      </div>

      {/* filter bar */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size="middle">
          <span style={{ fontWeight: 500 }}>筛选:</span>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 140 }}
            placeholder="状态"
          >
            <Select.Option value="all">全部状态</Select.Option>
            {Object.entries(statusConfig).map(([k, v]) => (
              <Select.Option key={k} value={k}>{v.text}</Select.Option>
            ))}
          </Select>
          <Select
            value={severityFilter}
            onChange={setSeverityFilter}
            style={{ width: 120 }}
            placeholder="严重程度"
          >
            <Select.Option value="all">全部程度</Select.Option>
            {Object.entries(severityConfig).map(([k, v]) => (
              <Select.Option key={k} value={k}>{v.text}</Select.Option>
            ))}
          </Select>
          <Input
            prefix={<SearchOutlined />}
            placeholder="搜索井号 / 工单号 / 描述"
            allowClear
            style={{ width: 260 }}
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
          />
          <RangePicker
            placeholder={['开始日期', '结束日期']}
            onChange={v => setDateRange(v as [dayjs.Dayjs | null, dayjs.Dayjs | null] | null)}
            style={{ width: 240 }}
          />
        </Space>
      </Card>

      {/* table */}
      <Spin spinning={loading}>
        {apiFailed ? (
          <Card size="small">
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#999' }}>
              <CloseCircleOutlined style={{ fontSize: 40, marginBottom: 16, color: '#ff4d4f' }} />
              <div style={{ fontSize: 16, marginBottom: 8 }}>无法连接后端服务</div>
              <div>请启动后端服务 (node server/index.cjs)</div>
              <Button type="primary" style={{ marginTop: 16 }} onClick={loadData}>重试</Button>
            </div>
          </Card>
        ) : (
          <Card
            size="small"
            title={`工单列表 (${filteredOrders.length})`}
          >
            <Table
              columns={columns}
              dataSource={filteredOrders}
              rowKey="id"
              scroll={{ x: 1100 }}
              pagination={{
                pageSize: 15,
                showSizeChanger: true,
                showTotal: total => `共 ${total} 条`,
                showQuickJumper: true,
              }}
            />
          </Card>
        )}
      </Spin>

      {renderDetailModal()}
      {renderProcessModal()}
    </div>
  )
}

export default WorkOrderList
