import React, { useEffect, useState, useMemo } from 'react'
import { Card, Table, Tag, Button, Space, Select, Input, DatePicker, Spin, message, Descriptions, Modal, Timeline, Divider, Statistic, Row, Col } from 'antd'
import { SearchOutlined, ExportOutlined, EyeOutlined, HistoryOutlined, FileTextOutlined, ReloadOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { fetchWorkOrders, fetchWorkOrder, type WorkOrderDTO, type WorkOrderLog } from '../../api/workOrderApi'

const { RangePicker } = DatePicker
const { Option } = Select

const statusConfig: Record<string, { color: string; text: string }> = {
  discovered: { color: 'red', text: '发现问题' },
  analyzing: { color: 'orange', text: '分析中' },
  solution_proposed: { color: 'gold', text: '已提方案' },
  pending_approval: { color: 'purple', text: '待审批' },
  executing: { color: 'blue', text: '执行中' },
  verifying: { color: '#722ed1', text: '验证中' },
  completed: { color: 'green', text: '已完成' },
  closed: { color: '#999', text: '已关闭' },
  cancelled: { color: '#999', text: '已取消' },
}

const severityConfig: Record<string, { color: string; text: string }> = {
  urgent: { color: 'red', text: '紧急' },
  high: { color: 'orange', text: '高' },
  medium: { color: 'blue', text: '中' },
  low: { color: 'default', text: '低' },
}

const WorkOrderHistory: React.FC = () => {
  const [orders, setOrders] = useState<WorkOrderDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [apiOk, setApiOk] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<WorkOrderDTO | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const loadOrders = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (severityFilter !== 'all') params.severity = severityFilter
      if (keyword) params.keyword = keyword
      if (dateRange?.[0]) params.start_date = dateRange[0].format('YYYY-MM-DD 00:00:00')
      if (dateRange?.[1]) params.end_date = dateRange[1].format('YYYY-MM-DD 23:59:59')
      const data = await fetchWorkOrders(params)
      setOrders(data)
      setApiOk(true)
    } catch {
      setApiOk(false)
      setOrders([])
    }
    setLoading(false)
  }

  useEffect(() => { loadOrders() }, [])

  const handleSearch = () => loadOrders()

  const openDetail = async (record: WorkOrderDTO) => {
    setDetailLoading(true)
    setDetailVisible(true)
    try {
      const detail = await fetchWorkOrder(record.id)
      setSelectedOrder(detail)
    } catch {
      setSelectedOrder(record)
    }
    setDetailLoading(false)
  }

  const stats = useMemo(() => {
    const total = orders.length
    const closed = orders.filter(o => o.status === 'closed' || o.status === 'completed').length
    const active = orders.filter(o => !['closed', 'completed', 'cancelled'].includes(o.status)).length
    const avgDays = orders.filter(o => o.close_time && o.discovered_time).reduce((sum, o) => {
      const d1 = dayjs(o.discovered_time)
      const d2 = dayjs(o.close_time)
      return sum + d2.diff(d1, 'day', true)
    }, 0) / (closed || 1)
    return { total, closed, active, avgDays: Math.round(avgDays * 10) / 10 }
  }, [orders])

  const handleExport = () => {
    const headers = ['工单编号', '井号', '油田', '区块', '诊断类型', '严重程度', '状态', '发现时间', '发现人', '分析人', '方案', '执行人', '验证结果', '关闭时间', '关闭原因']
    const rows = orders.map(o => [
      o.ticket_no, o.well_name, o.oil_field, o.block_name, o.diagnosis_type,
      severityConfig[o.severity]?.text || o.severity, statusConfig[o.status]?.text || o.status,
      o.discovered_time, o.discovered_by, o.analyzer, o.solution, o.executor,
      o.verify_result, o.close_time, o.close_reason,
    ])
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${(c || '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `工单历史_${dayjs().format('YYYYMMDD_HHmmss')}.csv`
    a.click()
    URL.revokeObjectURL(url)
    message.success('导出成功')
  }

  const columns: ColumnsType<WorkOrderDTO> = [
    {
      title: '工单编号', dataIndex: 'ticket_no', key: 'ticket_no', width: 170, fixed: 'left',
      render: (text) => <a style={{ fontWeight: 500 }}>{text}</a>,
    },
    {
      title: '井号', dataIndex: 'well_name', key: 'well_name', width: 120,
      render: (text, r) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: 11, color: '#999' }}>{r.oil_field} · {r.block_name}</div>
        </div>
      ),
    },
    { title: '诊断类型', dataIndex: 'diagnosis_type', key: 'diagnosis_type', width: 100 },
    {
      title: '严重程度', dataIndex: 'severity', key: 'severity', width: 80,
      render: (v: string) => <Tag color={severityConfig[v]?.color}>{severityConfig[v]?.text || v}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 100,
      render: (v: string) => <Tag color={statusConfig[v]?.color}>{statusConfig[v]?.text || v}</Tag>,
    },
    { title: '发现时间', dataIndex: 'discovered_time', key: 'discovered_time', width: 160, sorter: (a, b) => a.discovered_time.localeCompare(b.discovered_time) },
    { title: '发现人', dataIndex: 'discovered_by', key: 'discovered_by', width: 100 },
    { title: '分析人', dataIndex: 'analyzer', key: 'analyzer', width: 80, render: (v: string) => v || '-' },
    { title: '执行人', dataIndex: 'executor', key: 'executor', width: 80, render: (v: string) => v || '-' },
    { title: '关闭时间', dataIndex: 'close_time', key: 'close_time', width: 160, render: (v: string) => v || '-' },
    {
      title: '处理时长', key: 'duration', width: 100,
      render: (_, r) => {
        if (!r.close_time || !r.discovered_time) return '-'
        const days = dayjs(r.close_time).diff(dayjs(r.discovered_time), 'hour', true)
        return days < 24 ? `${Math.round(days)}小时` : `${Math.round(days / 24 * 10) / 10}天`
      },
    },
    {
      title: '操作', key: 'action', width: 80, fixed: 'right',
      render: (_, r) => <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => openDetail(r)}>详情</Button>,
    },
  ]

  const renderDetail = () => {
    if (!selectedOrder) return null
    const o = selectedOrder
    const logs: WorkOrderLog[] = o.logs || []

    return (
      <Modal
        title={<Space><FileTextOutlined /><span>工单详情 — {o.ticket_no}</span><Tag color={statusConfig[o.status]?.color}>{statusConfig[o.status]?.text}</Tag></Space>}
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        width={960}
        footer={<Button onClick={() => setDetailVisible(false)}>关闭</Button>}
      >
        <Spin spinning={detailLoading}>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ flex: 1 }}>
              <Descriptions title="基本信息" column={2} bordered size="small">
                <Descriptions.Item label="工单编号">{o.ticket_no}</Descriptions.Item>
                <Descriptions.Item label="井号">{o.well_name}</Descriptions.Item>
                <Descriptions.Item label="油田">{o.oil_field}</Descriptions.Item>
                <Descriptions.Item label="区块">{o.block_name}</Descriptions.Item>
                <Descriptions.Item label="诊断类型">{o.diagnosis_type}</Descriptions.Item>
                <Descriptions.Item label="工况代码">{o.condition_code}</Descriptions.Item>
                <Descriptions.Item label="严重程度"><Tag color={severityConfig[o.severity]?.color}>{severityConfig[o.severity]?.text}</Tag></Descriptions.Item>
                <Descriptions.Item label="优先级">{o.priority}</Descriptions.Item>
              </Descriptions>

              <Divider style={{ margin: '12px 0' }} />

              <Descriptions title="问题描述" column={1} bordered size="small">
                <Descriptions.Item label="问题描述">{o.problem_desc}</Descriptions.Item>
              </Descriptions>

              {o.solution && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Descriptions title="处理方案" column={1} bordered size="small">
                    <Descriptions.Item label="方案">{o.solution}</Descriptions.Item>
                    {o.solution_steps?.length > 0 && (
                      <Descriptions.Item label="步骤">
                        <ol style={{ margin: 0, paddingLeft: 20 }}>
                          {o.solution_steps.map((s, i) => <li key={i}>{s}</li>)}
                        </ol>
                      </Descriptions.Item>
                    )}
                    {o.estimated_cost > 0 && <Descriptions.Item label="预估成本">¥{o.estimated_cost.toLocaleString()}</Descriptions.Item>}
                    {o.actual_cost > 0 && <Descriptions.Item label="实际成本">¥{o.actual_cost.toLocaleString()}</Descriptions.Item>}
                  </Descriptions>
                </>
              )}

              {o.verify_result && (
                <>
                  <Divider style={{ margin: '12px 0' }} />
                  <Descriptions title="验证结果" column={1} bordered size="small">
                    <Descriptions.Item label="验证结果">{o.verify_result}</Descriptions.Item>
                    {o.close_reason && <Descriptions.Item label="关闭原因">{o.close_reason}</Descriptions.Item>}
                  </Descriptions>
                </>
              )}
            </div>

            <div style={{ width: 300, borderLeft: '1px solid #f0f0f0', paddingLeft: 24 }}>
              <h4 style={{ marginBottom: 16 }}><HistoryOutlined style={{ marginRight: 6 }} />操作记录 ({logs.length})</h4>
              <Timeline
                items={logs.map(log => ({
                  color: statusConfig[log.phase]?.color || '#999',
                  children: (
                    <div style={{ fontSize: 12 }}>
                      <div style={{ fontWeight: 600 }}>{log.action}</div>
                      <div style={{ color: '#888' }}>{log.operator}</div>
                      {log.detail && <div style={{ color: '#666', marginTop: 2 }}>{log.detail}</div>}
                      <div style={{ color: '#aaa', fontSize: 11, marginTop: 2 }}>{log.created_at}</div>
                    </div>
                  ),
                }))}
              />
            </div>
          </div>
        </Spin>
      </Modal>
    )
  }

  return (
    <div style={{ padding: 16 }}>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small"><Statistic title="总工单数" value={stats.total} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="进行中" value={stats.active} valueStyle={{ color: '#1677ff' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="已关闭" value={stats.closed} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col span={6}>
          <Card size="small"><Statistic title="平均处理天数" value={stats.avgDays} suffix="天" valueStyle={{ color: '#fa8c16' }} /></Card>
        </Col>
      </Row>

      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <span style={{ fontWeight: 500 }}>筛选:</span>
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }}>
            <Option value="all">全部状态</Option>
            {Object.entries(statusConfig).map(([k, v]) => <Option key={k} value={k}>{v.text}</Option>)}
          </Select>
          <Select value={severityFilter} onChange={setSeverityFilter} style={{ width: 110 }}>
            <Option value="all">全部级别</Option>
            {Object.entries(severityConfig).map(([k, v]) => <Option key={k} value={k}>{v.text}</Option>)}
          </Select>
          <RangePicker
            value={dateRange as [dayjs.Dayjs, dayjs.Dayjs] | null}
            onChange={(v) => setDateRange(v)}
            style={{ width: 260 }}
            placeholder={['开始日期', '结束日期']}
          />
          <Input
            placeholder="搜索井号/工单号/描述"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 220 }}
            suffix={<SearchOutlined style={{ color: '#999' }} />}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
          <Button icon={<ReloadOutlined />} onClick={() => { setStatusFilter('all'); setSeverityFilter('all'); setKeyword(''); setDateRange(null); loadOrders() }}>重置</Button>
          <Button icon={<ExportOutlined />} onClick={handleExport} disabled={orders.length === 0}>导出CSV</Button>
        </Space>
      </Card>

      {!apiOk && (
        <Card size="small" style={{ marginBottom: 16, background: '#fff7e6', borderColor: '#ffd591' }}>
          <Space>
            <span style={{ color: '#fa8c16' }}>后端服务未启动，请运行: <code>node server/index.cjs</code></span>
            <Button size="small" onClick={loadOrders}>重试</Button>
          </Space>
        </Card>
      )}

      <Card size="small" title={<Space><HistoryOutlined />工单历史记录 ({orders.length})</Space>}>
        <Spin spinning={loading}>
          <Table
            columns={columns}
            dataSource={orders}
            rowKey="id"
            scroll={{ x: 1600 }}
            pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          />
        </Spin>
      </Card>

      {renderDetail()}
    </div>
  )
}

export default WorkOrderHistory
