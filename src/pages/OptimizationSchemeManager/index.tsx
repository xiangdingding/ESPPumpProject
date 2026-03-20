import React, { useState, useMemo, useEffect } from 'react'
import {
  Row, Col, Card, Table, Tag, Statistic, Steps, Button, Select, Input, Badge,
  Space, Descriptions, Modal, message, Tooltip, Timeline, Empty,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
  EyeOutlined,
  FileTextOutlined,
  RocketOutlined,
  SolutionOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { fetchOptExecs, advanceOptExec, fetchOptExec, STATUS_LABELS, STATUS_COLORS } from '../../api/optExecApi'
import type { OptExecDTO, ExecStatus, ExecLog } from '../../api/optExecApi'

const statusFlow: ExecStatus[] = ['confirmed', 'executing', 'monitoring', 'completed', 'evaluated']
const statusFlowLabels = ['已确认', '执行中', '监测中', '已完成', '已评价']
const statusFlowIcons = [<FileTextOutlined />, <PlayCircleOutlined />, <SyncOutlined />, <CheckCircleOutlined />, <RocketOutlined />]

const nextStatusMap: Partial<Record<ExecStatus, { next: ExecStatus; label: string }>> = {
  confirmed: { next: 'executing', label: '开始执行' },
  executing: { next: 'monitoring', label: '进入监测' },
  monitoring: { next: 'completed', label: '标记完成' },
}

const OptimizationSchemeManager: React.FC = () => {
  const [execs, setExecs] = useState<OptExecDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [selectedExec, setSelectedExec] = useState<OptExecDTO | null>(null)
  const [selectedLogs, setSelectedLogs] = useState<ExecLog[]>([])

  const loadData = async () => {
    setLoading(true)
    try {
      const params: Record<string, string> = {}
      if (statusFilter !== 'all') params.status = statusFilter
      if (searchText) params.well_name = searchText
      const data = await fetchOptExecs(params)
      setExecs(data)
    } catch { message.error('加载执行记录失败') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [statusFilter])

  const filteredExecs = useMemo(() => {
    if (!searchText) return execs
    const kw = searchText.toLowerCase()
    return execs.filter(e => e.well_name.toLowerCase().includes(kw) || e.id.toLowerCase().includes(kw))
  }, [execs, searchText])

  const stats = useMemo(() => {
    const total = execs.length
    const confirmed = execs.filter(e => e.status === 'confirmed').length
    const executing = execs.filter(e => e.status === 'executing').length
    const monitoring = execs.filter(e => e.status === 'monitoring').length
    const completed = execs.filter(e => e.status === 'completed' || e.status === 'evaluated').length
    return { total, confirmed, executing, monitoring, completed }
  }, [execs])

  const handleSelect = async (record: OptExecDTO) => {
    try {
      const detail = await fetchOptExec(record.id)
      setSelectedExec(detail)
      setSelectedLogs(detail.logs || [])
    } catch { setSelectedExec(record); setSelectedLogs([]) }
  }

  const handleAdvance = (exec: OptExecDTO) => {
    const cfg = nextStatusMap[exec.status]
    if (!cfg) return
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
    Modal.confirm({
      title: `确认${cfg.label}`,
      content: `确定要将 ${exec.well_name} 的执行记录${cfg.label}吗？`,
      onOk: async () => {
        try {
          const timeField = cfg.next === 'executing' ? 'executed_at'
            : cfg.next === 'monitoring' ? 'monitored_at'
            : cfg.next === 'completed' ? 'completed_at' : undefined
          const updated = await advanceOptExec(exec.id, {
            status: cfg.next,
            ...(timeField ? { [timeField]: now } : {}),
            log_action: cfg.label, log_operator: '当前用户',
            log_detail: `状态变更：${STATUS_LABELS[exec.status]} → ${STATUS_LABELS[cfg.next]}`,
          })
          message.success(`${exec.well_name} 已${cfg.label}`)
          setExecs(prev => prev.map(e => e.id === exec.id ? { ...updated, logs: updated.logs } : e))
          if (selectedExec?.id === exec.id) {
            setSelectedExec(updated)
            setSelectedLogs(updated.logs || [])
          }
        } catch (err: any) { message.error(`操作失败：${err.message}`) }
      },
    })
  }

  const handleCancel = (exec: OptExecDTO) => {
    Modal.confirm({
      title: '确认取消',
      content: `确定要取消 ${exec.well_name} 的执行记录吗？`,
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          const updated = await advanceOptExec(exec.id, {
            status: 'cancelled',
            log_action: '取消执行', log_operator: '当前用户', log_detail: '用户手动取消',
          })
          message.success(`${exec.well_name} 执行记录已取消`)
          setExecs(prev => prev.map(e => e.id === exec.id ? updated : e))
          if (selectedExec?.id === exec.id) { setSelectedExec(updated); setSelectedLogs(updated.logs || []) }
        } catch (err: any) { message.error(`操作失败：${err.message}`) }
      },
    })
  }

  const getFlowStep = (status: ExecStatus) => {
    const idx = statusFlow.indexOf(status)
    return idx >= 0 ? idx : 0
  }

  const columns: ColumnsType<OptExecDTO> = [
    {
      title: '记录ID', dataIndex: 'id', width: 110, fixed: 'left',
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{v}</span>,
    },
    { title: '井名', dataIndex: 'well_name', width: 110 },
    {
      title: '方案类型', dataIndex: 'scheme_type', width: 100,
      render: (v: string) => <Tag color={v === '方案一' ? 'blue' : 'green'}>{v}</Tag>,
    },
    {
      title: '方案描述', dataIndex: 'scheme_desc', width: 120,
      render: (v: string) => <Tag color="cyan">{v || '-'}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 100, align: 'center',
      render: (s: ExecStatus) => (
        <Badge color={STATUS_COLORS[s]} text={<Tag color={STATUS_COLORS[s]}>{STATUS_LABELS[s]}</Tag>} />
      ),
    },
    {
      title: '确认时间', dataIndex: 'confirmed_at', width: 150,
      sorter: (a, b) => new Date(a.confirmed_at).getTime() - new Date(b.confirmed_at).getTime(),
    },
    {
      title: '操作人', dataIndex: 'operator', width: 80,
    },
    {
      title: '油压调整', width: 140, align: 'center',
      render: (_: unknown, r: OptExecDTO) => (
        <span>{r.oil_p_current} → <span style={{ color: '#1677ff', fontWeight: 500 }}>{r.oil_p_recommend}</span> MPa</span>
      ),
    },
    {
      title: '预测产液', width: 140, align: 'center',
      render: (_: unknown, r: OptExecDTO) => (
        <span>{r.liquid_current} → <span style={{ color: '#52c41a', fontWeight: 500 }}>{r.liquid_predict}</span> m³/d</span>
      ),
    },
    {
      title: '操作', width: 160, fixed: 'right', align: 'center',
      render: (_: unknown, record: OptExecDTO) => (
        <Space size={4}>
          <Tooltip title="查看详情">
            <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => handleSelect(record)} />
          </Tooltip>
          {nextStatusMap[record.status] && (
            <Tooltip title={nextStatusMap[record.status]!.label}>
              <Button type="link" size="small" icon={<PlayCircleOutlined />} style={{ color: '#fa8c16' }}
                onClick={() => handleAdvance(record)} />
            </Tooltip>
          )}
          {(record.status === 'confirmed' || record.status === 'executing') && (
            <Tooltip title="取消">
              <Button type="link" size="small" icon={<StopOutlined />} danger onClick={() => handleCancel(record)} />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ]

  return (
    <div className="page-container" style={{ padding: 20, background: '#f0f2f5', minHeight: '100%' }}>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={12}>
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 130 }}
            options={[
              { value: 'all', label: '全部状态' },
              ...statusFlow.map(s => ({ value: s, label: STATUS_LABELS[s] })),
              { value: 'cancelled', label: '已取消' },
            ]}
          />
          <Input placeholder="搜索井名/记录ID" prefix={<SearchOutlined />} allowClear
            style={{ width: 220 }} value={searchText} onChange={e => setSearchText(e.target.value)}
            onPressEnter={loadData} />
          <Button icon={<SyncOutlined />} onClick={loadData} loading={loading}>刷新</Button>
        </Space>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card size="small" hoverable>
            <Statistic title="执行记录总数" value={stats.total} prefix={<FileTextOutlined style={{ color: '#1677ff' }} />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable>
            <Statistic title="待执行" value={stats.confirmed} prefix={<ExclamationCircleOutlined style={{ color: '#1677ff' }} />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable>
            <Statistic title="执行/监测中" value={stats.executing + stats.monitoring} prefix={<ClockCircleOutlined style={{ color: '#fa8c16' }} />} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable>
            <Statistic title="已完成/已评价" value={stats.completed} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" hoverable>
            <Statistic title="监测中" value={stats.monitoring} prefix={<SyncOutlined style={{ color: '#13c2c2' }} />} valueStyle={{ color: '#13c2c2' }} />
          </Card>
        </Col>
      </Row>

      <Card title={<Space><SolutionOutlined />执行记录列表</Space>} size="small" style={{ marginBottom: 16 }}>
        <Table<OptExecDTO>
          columns={columns}
          dataSource={filteredExecs}
          rowKey="id"
          size="small"
          loading={loading}
          scroll={{ x: 1500 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
          onRow={record => ({
            onClick: () => handleSelect(record),
            style: { cursor: 'pointer', background: selectedExec?.id === record.id ? '#e6f4ff' : undefined },
          })}
        />
      </Card>

      {selectedExec && (
        <>
          <Card title="执行状态流转" size="small" style={{ marginBottom: 16 }}>
            <Steps
              current={getFlowStep(selectedExec.status)}
              status={selectedExec.status === 'cancelled' ? 'error' : 'process'}
              items={statusFlowLabels.map((label, i) => ({
                title: label,
                icon: statusFlowIcons[i],
              }))}
            />
            {selectedExec.status === 'cancelled' && (
              <div style={{ textAlign: 'center', marginTop: 8 }}>
                <Tag color="red" icon={<StopOutlined />}>该执行记录已取消</Tag>
              </div>
            )}
          </Card>

          <Row gutter={16}>
            <Col span={14}>
              <Card title="执行详情" size="small" style={{ marginBottom: 16 }}>
                <Descriptions column={3} size="small" bordered>
                  <Descriptions.Item label="记录ID"><span style={{ fontFamily: 'monospace' }}>{selectedExec.id}</span></Descriptions.Item>
                  <Descriptions.Item label="井名">{selectedExec.well_name}</Descriptions.Item>
                  <Descriptions.Item label="方案类型">
                    <Tag color={selectedExec.scheme_type === '方案一' ? 'blue' : 'green'}>{selectedExec.scheme_type}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="方案描述">{selectedExec.scheme_desc || '-'}</Descriptions.Item>
                  <Descriptions.Item label="操作人">{selectedExec.operator || '-'}</Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Badge color={STATUS_COLORS[selectedExec.status]} text={STATUS_LABELS[selectedExec.status]} />
                  </Descriptions.Item>
                  <Descriptions.Item label="确认时间">{selectedExec.confirmed_at}</Descriptions.Item>
                  <Descriptions.Item label="执行时间">{selectedExec.executed_at || '-'}</Descriptions.Item>
                  <Descriptions.Item label="监测时间">{selectedExec.monitored_at || '-'}</Descriptions.Item>
                  <Descriptions.Item label="完成时间">{selectedExec.completed_at || '-'}</Descriptions.Item>
                  <Descriptions.Item label="评价时间">{selectedExec.evaluated_at || '-'}</Descriptions.Item>
                  <Descriptions.Item label="备注">{selectedExec.remark || '-'}</Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title="参数调整" size="small" style={{ marginBottom: 16 }}>
                <Table
                  size="small"
                  pagination={false}
                  dataSource={[
                    { key: 'oil_p', param: '油压(MPa)', current: selectedExec.oil_p_current, recommend: selectedExec.oil_p_recommend },
                    { key: 'freq', param: '频率(Hz)', current: selectedExec.freq_current, recommend: selectedExec.freq_recommend },
                    { key: 'liquid', param: '产液量(m³/d)', current: selectedExec.liquid_current, recommend: selectedExec.liquid_predict },
                  ]}
                  columns={[
                    { title: '参数', dataIndex: 'param', width: 140 },
                    { title: '当前值', dataIndex: 'current', width: 120, align: 'center', render: (v: number | string) => <span style={{ fontWeight: 500 }}>{v}</span> },
                    { title: '推荐值', dataIndex: 'recommend', width: 120, align: 'center', render: (v: number | string) => <span style={{ fontWeight: 600, color: '#1677ff' }}>{v}</span> },
                  ]}
                />
              </Card>

              {selectedExec.liquid_actual > 0 && (
                <Card title="执行效果" size="small" style={{ marginBottom: 16 }}>
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic title="实际产液量" value={selectedExec.liquid_actual} suffix="m³/d" valueStyle={{ color: '#52c41a', fontSize: 20 }} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="预测达标率" value={Math.round(selectedExec.liquid_actual / selectedExec.liquid_predict * 100)} suffix="%" valueStyle={{ color: '#1677ff', fontSize: 20 }} />
                    </Col>
                    <Col span={8}>
                      <Statistic title="节能量" value={selectedExec.energy_saved} suffix="kWh/d" valueStyle={{ color: '#fa8c16', fontSize: 20 }} />
                    </Col>
                  </Row>
                </Card>
              )}
            </Col>

            <Col span={10}>
              <Card title="操作日志" size="small" style={{ marginBottom: 16 }}>
                {selectedLogs.length === 0 ? (
                  <Empty description="暂无操作日志" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <Timeline
                    items={selectedLogs.map(log => ({
                      color: log.phase === 'cancelled' ? 'red' : log.phase === 'evaluated' ? 'green' : 'blue',
                      children: (
                        <div>
                          <div style={{ fontWeight: 500, fontSize: 13 }}>{log.action}</div>
                          {log.detail && <div style={{ color: '#595959', fontSize: 12 }}>{log.detail}</div>}
                          <div style={{ color: '#8c8c8c', fontSize: 11, marginTop: 2 }}>
                            <ClockCircleOutlined style={{ marginRight: 4 }} />{log.created_at}
                            {log.operator && <span style={{ marginLeft: 8 }}>操作人: {log.operator}</span>}
                          </div>
                        </div>
                      ),
                    }))}
                  />
                )}
              </Card>

              {nextStatusMap[selectedExec.status] && (
                <Card size="small" style={{ marginBottom: 16 }}>
                  <Button type="primary" block icon={<PlayCircleOutlined />}
                    onClick={() => handleAdvance(selectedExec)}>
                    {nextStatusMap[selectedExec.status]!.label}
                  </Button>
                </Card>
              )}

              {(selectedExec.status === 'confirmed' || selectedExec.status === 'executing') && (
                <Card size="small">
                  <Button danger block icon={<StopOutlined />} onClick={() => handleCancel(selectedExec)}>
                    取消执行
                  </Button>
                </Card>
              )}
            </Col>
          </Row>
        </>
      )}
    </div>
  )
}

export default OptimizationSchemeManager
