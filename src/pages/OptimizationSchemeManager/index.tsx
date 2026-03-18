import React, { useState, useMemo } from 'react'
import {
  Row, Col, Card, Table, Tag, Statistic, Steps, Button, Select, Input, Badge,
  Space, Divider, Alert, Descriptions, Modal, message, Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined,
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
  EyeOutlined,
  AuditOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
  FileTextOutlined,
  DollarOutlined,
  RocketOutlined,
  SolutionOutlined,
} from '@ant-design/icons'
import { optimizationSchemes, type OptimizationScheme } from '../../mock/wellData'

const priorityConfig: Record<string, { color: string; label: string }> = {
  urgent: { color: 'red', label: '紧急' },
  high: { color: 'orange', label: '高' },
  medium: { color: 'blue', label: '中' },
  low: { color: 'green', label: '低' },
}

const statusConfig: Record<string, { color: string; label: string; badge: 'default' | 'processing' | 'success' | 'warning' | 'error' }> = {
  draft: { color: 'default', label: '草稿', badge: 'default' },
  approved: { color: 'blue', label: '已审批', badge: 'processing' },
  executing: { color: 'orange', label: '执行中', badge: 'warning' },
  completed: { color: 'green', label: '已完成', badge: 'success' },
  cancelled: { color: 'red', label: '已取消', badge: 'error' },
}

const statusFlow = ['draft', 'approved', 'executing', 'completed']
const statusFlowLabels = ['草稿', '已审批', '执行中', '已完成']

const OptimizationSchemeManager: React.FC = () => {
  const [schemes, setSchemes] = useState<OptimizationScheme[]>(optimizationSchemes)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [selectedScheme, setSelectedScheme] = useState<OptimizationScheme | null>(null)

  const types = useMemo(() => [...new Set(schemes.map(s => s.type))], [schemes])

  const filteredSchemes = useMemo(() => {
    return schemes.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (priorityFilter !== 'all' && s.priority !== priorityFilter) return false
      if (typeFilter !== 'all' && s.type !== typeFilter) return false
      if (searchText && !s.wellName.includes(searchText) && !s.id.includes(searchText) && !s.type.includes(searchText)) return false
      return true
    })
  }, [schemes, statusFilter, priorityFilter, typeFilter, searchText])

  const stats = useMemo(() => {
    const total = schemes.length
    const draft = schemes.filter(s => s.status === 'draft').length
    const executing = schemes.filter(s => s.status === 'executing').length
    const completed = schemes.filter(s => s.status === 'completed').length
    const totalBenefit = schemes.reduce((sum, s) => sum + s.benefitEstimate, 0)
    return { total, draft, executing, completed, totalBenefit }
  }, [schemes])

  const handleStatusChange = (id: string, newStatus: OptimizationScheme['status']) => {
    const labels: Record<string, string> = {
      approved: '审批通过', executing: '开始执行', completed: '标记完成', cancelled: '取消方案',
    }
    Modal.confirm({
      title: `确认${labels[newStatus] || '操作'}`,
      content: `确定要将方案 ${id} ${labels[newStatus]}吗？`,
      onOk: () => {
        setSchemes(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s))
        if (selectedScheme?.id === id) {
          setSelectedScheme(prev => prev ? { ...prev, status: newStatus } : null)
        }
        message.success(`方案 ${id} 已${labels[newStatus]}`)
      },
    })
  }

  const getFlowStep = (status: string) => {
    const idx = statusFlow.indexOf(status)
    return idx >= 0 ? idx : 0
  }

  const columns: ColumnsType<OptimizationScheme> = [
    {
      title: '方案ID', dataIndex: 'id', width: 100, fixed: 'left',
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{v}</span>,
    },
    { title: '井名', dataIndex: 'wellName', width: 120 },
    {
      title: '类型', dataIndex: 'type', width: 100,
      render: (v: string) => <Tag color="cyan">{v}</Tag>,
    },
    {
      title: '优先级', dataIndex: 'priority', width: 90, align: 'center',
      sorter: (a, b) => {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 }
        return (order[a.priority] ?? 4) - (order[b.priority] ?? 4)
      },
      render: (p: string) => {
        const cfg = priorityConfig[p]
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : p
      },
    },
    {
      title: '状态', dataIndex: 'status', width: 110, align: 'center',
      filters: Object.entries(statusConfig).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (value, record) => record.status === value,
      render: (s: string) => {
        const cfg = statusConfig[s]
        return cfg ? <Badge status={cfg.badge} text={<Tag color={cfg.color}>{cfg.label}</Tag>} /> : s
      },
    },
    {
      title: '创建时间', dataIndex: 'createTime', width: 160,
      sorter: (a, b) => new Date(a.createTime).getTime() - new Date(b.createTime).getTime(),
    },
    {
      title: '预计成本', dataIndex: 'costEstimate', width: 110, align: 'right',
      sorter: (a, b) => a.costEstimate - b.costEstimate,
      render: (v: number) => `¥${(v / 10000).toFixed(2)}万`,
    },
    {
      title: '预计收益', dataIndex: 'benefitEstimate', width: 110, align: 'right',
      sorter: (a, b) => a.benefitEstimate - b.benefitEstimate,
      render: (v: number) => <span style={{ color: '#52c41a', fontWeight: 500 }}>{`¥${(v / 10000).toFixed(2)}万`}</span>,
    },
    {
      title: '投入产出比', width: 110, align: 'center',
      sorter: (a, b) => (a.benefitEstimate / a.costEstimate) - (b.benefitEstimate / b.costEstimate),
      render: (_: unknown, r: OptimizationScheme) => {
        const ratio = r.benefitEstimate / r.costEstimate
        return <span style={{ color: ratio >= 5 ? '#52c41a' : ratio >= 2 ? '#1677ff' : '#fa8c16', fontWeight: 600 }}>1:{ratio.toFixed(1)}</span>
      },
    },
    {
      title: '操作', width: 220, fixed: 'right', align: 'center',
      render: (_: unknown, record: OptimizationScheme) => (
        <Space size={4}>
          <Tooltip title="查看详情">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => setSelectedScheme(record)} />
          </Tooltip>
          {record.status === 'draft' && (
            <Tooltip title="审批通过">
              <Button type="link" size="small" icon={<AuditOutlined />} style={{ color: '#1677ff' }}
                onClick={() => handleStatusChange(record.id, 'approved')} />
            </Tooltip>
          )}
          {record.status === 'approved' && (
            <Tooltip title="开始执行">
              <Button type="link" size="small" icon={<PlayCircleOutlined />} style={{ color: '#fa8c16' }}
                onClick={() => handleStatusChange(record.id, 'executing')} />
            </Tooltip>
          )}
          {record.status === 'executing' && (
            <Tooltip title="标记完成">
              <Button type="link" size="small" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }}
                onClick={() => handleStatusChange(record.id, 'completed')} />
            </Tooltip>
          )}
          {(record.status === 'draft' || record.status === 'approved') && (
            <Tooltip title="取消">
              <Button type="link" size="small" icon={<StopOutlined />} danger
                onClick={() => handleStatusChange(record.id, 'cancelled')} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  const paramKeys = selectedScheme
    ? [...new Set([...Object.keys(selectedScheme.currentParams), ...Object.keys(selectedScheme.suggestedParams)])]
    : []

  const paramLabels: Record<string, string> = {
    frequency: '运行频率(Hz)', current: '电流(A)', efficiency: '泵效(%)',
    dailyLiquid: '日产液(t)', power: '功率(kW)', temperature: '温度(°C)',
    vibration: '振动(mm/s)', dailyOil: '日产油(t)', runDays: '运行天数',
  }

  return (
    <div className="page-container" style={{ padding: 20, background: '#f0f2f5', minHeight: '100%' }}>
      {/* 顶部操作区 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={12}>
          <Button type="primary" icon={<PlusOutlined />}>新建方案</Button>
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'draft', label: '草稿' },
              { value: 'approved', label: '已审批' },
              { value: 'executing', label: '执行中' },
              { value: 'completed', label: '已完成' },
              { value: 'cancelled', label: '已取消' },
            ]}
          />
          <Select value={priorityFilter} onChange={setPriorityFilter} style={{ width: 130 }}
            options={[
              { value: 'all', label: '全部优先级' },
              { value: 'urgent', label: '紧急' },
              { value: 'high', label: '高' },
              { value: 'medium', label: '中' },
              { value: 'low', label: '低' },
            ]}
          />
          <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 130 }}
            options={[{ value: 'all', label: '全部类型' }, ...types.map(t => ({ value: t, label: t }))]}
          />
          <Input placeholder="搜索井名/方案ID/类型" prefix={<SearchOutlined />} allowClear
            style={{ width: 220 }} value={searchText} onChange={e => setSearchText(e.target.value)} />
        </Space>
      </Card>

      {/* 统计卡片 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={4}>
          <Card size="small" hoverable>
            <Statistic title="方案总数" value={stats.total} prefix={<FileTextOutlined style={{ color: '#1677ff' }} />}
              valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable>
            <Statistic title="草稿" value={stats.draft} prefix={<ExclamationCircleOutlined style={{ color: '#8c8c8c' }} />}
              valueStyle={{ color: '#8c8c8c' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable>
            <Statistic title="执行中" value={stats.executing} prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />}
              valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable>
            <Statistic title="已完成" value={stats.completed} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable>
            <Statistic title="总预计收益" value={(stats.totalBenefit / 10000).toFixed(1)} suffix="万元"
              prefix={<DollarOutlined style={{ color: '#eb2f96' }} />} valueStyle={{ color: '#eb2f96' }} />
          </Card>
        </Col>
      </Row>

      {/* 方案列表 */}
      <Card title={<Space><SolutionOutlined />方案列表</Space>} size="small" style={{ marginBottom: 16 }}>
        <Table<OptimizationScheme>
          columns={columns}
          dataSource={filteredSchemes}
          rowKey="id"
          size="small"
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 8, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
          onRow={record => ({
            onClick: () => setSelectedScheme(record),
            style: { cursor: 'pointer', background: selectedScheme?.id === record.id ? '#e6f4ff' : undefined },
          })}
        />
      </Card>

      {/* 方案详情 */}
      {selectedScheme && (
        <>
          {/* 状态流转 */}
          <Card title="方案状态流转" size="small" style={{ marginBottom: 16 }}>
            <Steps
              current={getFlowStep(selectedScheme.status)}
              status={selectedScheme.status === 'cancelled' ? 'error' : 'process'}
              items={statusFlowLabels.map((label, i) => ({
                title: label,
                icon: i === 0 ? <FileTextOutlined /> : i === 1 ? <AuditOutlined /> : i === 2 ? <PlayCircleOutlined /> : <CheckCircleOutlined />,
              }))}
            />
            {selectedScheme.status === 'cancelled' && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Tag color="red" icon={<StopOutlined />}>该方案已取消</Tag>
              </div>
            )}
          </Card>

          <Row gutter={16}>
            {/* 左侧：基本信息 + 参数对比 + 预期效果 */}
            <Col span={14}>
              <Card title="基本信息" size="small" style={{ marginBottom: 16 }}>
                <Descriptions column={3} size="small" bordered>
                  <Descriptions.Item label="方案ID"><span style={{ fontFamily: 'monospace' }}>{selectedScheme.id}</span></Descriptions.Item>
                  <Descriptions.Item label="井名">{selectedScheme.wellName}</Descriptions.Item>
                  <Descriptions.Item label="类型"><Tag color="cyan">{selectedScheme.type}</Tag></Descriptions.Item>
                  <Descriptions.Item label="优先级">
                    <Tag color={priorityConfig[selectedScheme.priority]?.color}>{priorityConfig[selectedScheme.priority]?.label}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Badge status={statusConfig[selectedScheme.status]?.badge} text={statusConfig[selectedScheme.status]?.label} />
                  </Descriptions.Item>
                  <Descriptions.Item label="创建时间">{selectedScheme.createTime}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title="参数对比（当前 vs 建议）" size="small" style={{ marginBottom: 16 }}>
                <Table
                  size="small"
                  pagination={false}
                  dataSource={paramKeys.map(key => ({
                    key,
                    param: paramLabels[key] || key,
                    current: selectedScheme.currentParams[key],
                    suggested: selectedScheme.suggestedParams[key],
                  }))}
                  columns={[
                    { title: '参数', dataIndex: 'param', width: 160 },
                    {
                      title: '当前值', dataIndex: 'current', width: 120, align: 'center',
                      render: (v: number | string) => <span style={{ fontWeight: 500 }}>{v}</span>,
                    },
                    {
                      title: '建议值', dataIndex: 'suggested', width: 120, align: 'center',
                      render: (v: number | string) => <span style={{ fontWeight: 600, color: '#1677ff' }}>{v}</span>,
                    },
                    {
                      title: '变化', width: 100, align: 'center',
                      render: (_: unknown, r: { current: number | string; suggested: number | string }) => {
                        const c = Number(r.current)
                        const s = Number(r.suggested)
                        if (isNaN(c) || isNaN(s) || c === s) return <span style={{ color: '#8c8c8c' }}>—</span>
                        const up = s > c
                        return (
                          <span style={{ color: up ? '#52c41a' : '#ff4d4f', fontWeight: 500 }}>
                            {up ? <CaretUpOutlined /> : <CaretDownOutlined />}
                            {Math.abs(((s - c) / c) * 100).toFixed(1)}%
                          </span>
                        )
                      },
                    },
                  ]}
                />
              </Card>

              <Card title="预期效果" size="small" style={{ marginBottom: 16 }}>
                <Table
                  size="small"
                  pagination={false}
                  dataSource={selectedScheme.expectedResults.map((r, i) => ({ ...r, key: i }))}
                  columns={[
                    { title: '指标', dataIndex: 'metric', width: 120 },
                    {
                      title: '优化前', dataIndex: 'before', width: 100, align: 'center',
                      render: (v: number, r: { unit: string }) => `${v} ${r.unit}`,
                    },
                    {
                      title: '优化后', dataIndex: 'after', width: 100, align: 'center',
                      render: (v: number, r: { unit: string }) => <span style={{ fontWeight: 600, color: '#1677ff' }}>{v} {r.unit}</span>,
                    },
                    {
                      title: '改善幅度', dataIndex: 'improvement', width: 120, align: 'center',
                      render: (v: string) => {
                        const isPositive = v.startsWith('+')
                        const isNegative = v.startsWith('-')
                        let color = '#8c8c8c'
                        if (isPositive) color = '#52c41a'
                        if (isNegative) color = '#ff4d4f'
                        return <Tag color={isPositive ? 'green' : isNegative ? 'red' : 'default'}>{v}</Tag>
                      },
                    },
                  ]}
                />
              </Card>
            </Col>

            {/* 右侧：实施步骤 + 成本收益 + 风险 + 原因 */}
            <Col span={10}>
              <Card title="实施步骤" size="small" style={{ marginBottom: 16 }}>
                <Steps
                  direction="vertical"
                  size="small"
                  current={selectedScheme.status === 'completed' ? selectedScheme.steps.length : selectedScheme.status === 'executing' ? 1 : 0}
                  items={selectedScheme.steps.map(step => ({
                    title: <span style={{ fontWeight: 500 }}>{step.title}</span>,
                    description: (
                      <div>
                        <div style={{ color: '#595959', fontSize: 13 }}>{step.description}</div>
                        <div style={{ color: '#8c8c8c', fontSize: 12, marginTop: 2 }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />预计时长: {step.duration}
                        </div>
                      </div>
                    ),
                  }))}
                />
              </Card>

              <Card title="成本收益分析" size="small" style={{ marginBottom: 16 }}>
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="预计成本"
                      value={(selectedScheme.costEstimate / 10000).toFixed(2)}
                      suffix="万元"
                      valueStyle={{ color: '#ff4d4f', fontSize: 20 }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="预计收益"
                      value={(selectedScheme.benefitEstimate / 10000).toFixed(2)}
                      suffix="万元"
                      valueStyle={{ color: '#52c41a', fontSize: 20 }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="投入产出比"
                      value={`1:${(selectedScheme.benefitEstimate / selectedScheme.costEstimate).toFixed(1)}`}
                      valueStyle={{ color: '#1677ff', fontSize: 20, fontWeight: 600 }}
                      prefix={<RocketOutlined />}
                    />
                  </Col>
                </Row>
              </Card>

              <Card title="风险评估" size="small" style={{ marginBottom: 16 }}>
                <Alert
                  type={selectedScheme.priority === 'urgent' ? 'error' : selectedScheme.priority === 'high' ? 'warning' : 'info'}
                  showIcon
                  message="风险提示"
                  description={selectedScheme.riskAssessment}
                />
              </Card>

              <Card title="优化原因" size="small">
                <Alert type="info" showIcon message="分析说明" description={selectedScheme.reason} />
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}

export default OptimizationSchemeManager
