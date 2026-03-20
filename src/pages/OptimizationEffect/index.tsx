import React, { useState, useMemo, useEffect } from 'react'
import { Row, Col, Card, Table, Tag, Statistic, Select, Space, DatePicker, Button, Empty, Modal, Input, message, Badge } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckCircleOutlined,

  RiseOutlined,
  DollarOutlined,
  FundOutlined,
  TrophyOutlined,
  SyncOutlined,
  StarOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { fetchOptExecs, advanceOptExec, STATUS_LABELS, STATUS_COLORS, RATING_LABELS, RATING_COLORS } from '../../api/optExecApi'
import type { OptExecDTO, EvalRating } from '../../api/optExecApi'

const { RangePicker } = DatePicker

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const OptimizationEffect: React.FC = () => {
  const [execs, setExecs] = useState<OptExecDTO[]>([])
  const [loading, setLoading] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [evalModal, setEvalModal] = useState<{ visible: boolean; exec: OptExecDTO | null }>({ visible: false, exec: null })
  const [evalRating, setEvalRating] = useState<string>('')
  const [evalSummary, setEvalSummary] = useState('')

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await fetchOptExecs()
      setExecs(data.filter(e => ['monitoring', 'completed', 'evaluated'].includes(e.status)))
    } catch { message.error('加载数据失败') }
    finally { setLoading(false) }
  }

  useEffect(() => { loadData() }, [])

  const filteredExecs = useMemo(() => {
    if (statusFilter === 'all') return execs
    return execs.filter(e => e.status === statusFilter)
  }, [execs, statusFilter])

  const overallStats = useMemo(() => {
    const completed = execs.filter(e => e.status === 'completed' || e.status === 'evaluated').length
    const evaluated = execs.filter(e => e.status === 'evaluated').length
    let totalLiquidIncrease = 0

    let excellentCount = 0

    execs.forEach(e => {
      if (e.liquid_actual > 0) totalLiquidIncrease += Math.max(0, e.liquid_actual - e.liquid_current)

      if (e.eval_rating === 'excellent') excellentCount++
    })

    return { completed, evaluated, totalLiquidIncrease: Math.round(totalLiquidIncrease * 10) / 10, excellentCount }
  }, [execs])

  const comparisonChartOption = useMemo(() => {
    const items = filteredExecs.filter(e => e.liquid_actual > 0)
    if (items.length === 0) return {}
    return {
      title: { text: '各方案产液量预期 vs 实际对比', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' as const },
      legend: { bottom: 0, data: ['预测产液量(m³/d)', '实际产液量(m³/d)'] },
      grid: { top: 50, bottom: 60, left: 60, right: 20 },
      xAxis: { type: 'category' as const, data: items.map(e => `${e.id}\n${e.well_name}`), axisLabel: { fontSize: 10, interval: 0 } },
      yAxis: { type: 'value' as const, name: '产液量(m³/d)', nameTextStyle: { fontSize: 11 } },
      series: [
        { name: '预测产液量(m³/d)', type: 'bar' as const, data: items.map(e => e.liquid_predict), barWidth: 30, itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] } },
        { name: '实际产液量(m³/d)', type: 'bar' as const, data: items.map(e => e.liquid_actual), barWidth: 30, itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] } },
      ],
    }
  }, [filteredExecs])

  const trendChartOption = useMemo(() => {
    const days = 30
    const dates: string[] = []
    for (let i = days; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      dates.push(`${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)
    }
    const optimizationDay = Math.floor(days * 0.3)
    const liquidData = dates.map((_, i) => {
      const base = i < optimizationDay ? 42 : 42 + ((i - optimizationDay) / (days - optimizationDay)) * 15
      return Math.round((base + (seededRandom(i * 7) - 0.5) * 4) * 10) / 10
    })
    const effData = dates.map((_, i) => {
      const base = i < optimizationDay ? 38 : 38 + ((i - optimizationDay) / (days - optimizationDay)) * 10
      return Math.round((base + (seededRandom(i * 13) - 0.5) * 3) * 10) / 10
    })
    return {
      title: { text: '优化实施后关键指标变化趋势', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' as const },
      legend: { bottom: 0, data: ['日产液(m³/d)', '泵效(%)'] },
      grid: { top: 50, bottom: 60, left: 60, right: 20 },
      xAxis: { type: 'category' as const, data: dates, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'value' as const },
      series: [
        { name: '日产液(m³/d)', type: 'line' as const, data: liquidData, smooth: true, itemStyle: { color: '#1677ff' }, lineStyle: { width: 2 },
          markLine: { silent: true, data: [{ xAxis: optimizationDay, label: { formatter: '优化实施', fontSize: 11 }, lineStyle: { color: '#ff4d4f', type: 'dashed' as const } }] } },
        { name: '泵效(%)', type: 'line' as const, data: effData, smooth: true, itemStyle: { color: '#52c41a' }, lineStyle: { width: 2 } },
      ],
    }
  }, [])

  const openEvalModal = (exec: OptExecDTO) => {
    setEvalModal({ visible: true, exec })
    setEvalRating(exec.eval_rating || '')
    setEvalSummary(exec.eval_summary || '')
  }

  const doEvaluate = async () => {
    if (!evalModal.exec) return
    if (!evalRating) { message.warning('请选择效果评级'); return }
    try {
      const now = new Date().toISOString().replace('T', ' ').slice(0, 19)
      const updated = await advanceOptExec(evalModal.exec.id, {
        status: 'evaluated',
        evaluated_at: now,
        eval_rating: evalRating,
        eval_summary: evalSummary.trim(),
        log_action: '效果评价', log_operator: '当前用户',
        log_detail: `评级：${RATING_LABELS[evalRating] || evalRating}，${evalSummary.trim()}`,
      })
      setExecs(prev => prev.map(e => e.id === updated.id ? updated : e))
      setEvalModal({ visible: false, exec: null })
      message.success('效果评价已提交')
    } catch (err: any) { message.error(`评价失败：${err.message}`) }
  }

  const columns: ColumnsType<OptExecDTO> = [
    { title: '记录ID', dataIndex: 'id', width: 110, render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{v}</span> },
    { title: '井名', dataIndex: 'well_name', width: 110 },
    { title: '方案', dataIndex: 'scheme_type', width: 80, render: (v: string) => <Tag color={v === '方案一' ? 'blue' : 'green'}>{v}</Tag> },
    { title: '状态', dataIndex: 'status', width: 90, align: 'center', render: (s: string) => <Badge color={STATUS_COLORS[s as keyof typeof STATUS_COLORS]} text={<Tag color={STATUS_COLORS[s as keyof typeof STATUS_COLORS]}>{STATUS_LABELS[s as keyof typeof STATUS_LABELS]}</Tag>} /> },
    { title: '当前产液', dataIndex: 'liquid_current', width: 100, align: 'center', render: (v: number) => `${v} m³/d` },
    { title: '预测产液', dataIndex: 'liquid_predict', width: 100, align: 'center', render: (v: number) => <span style={{ color: '#1677ff' }}>{v} m³/d</span> },
    {
      title: '实际产液', dataIndex: 'liquid_actual', width: 100, align: 'center',
      render: (v: number) => v > 0 ? <span style={{ color: '#52c41a', fontWeight: 600 }}>{v} m³/d</span> : '-',
    },
    {
      title: '达标率', width: 80, align: 'center',
      sorter: (a, b) => {
        const ra = a.liquid_actual > 0 ? a.liquid_actual / a.liquid_predict * 100 : 0
        const rb = b.liquid_actual > 0 ? b.liquid_actual / b.liquid_predict * 100 : 0
        return ra - rb
      },
      render: (_: unknown, r: OptExecDTO) => {
        if (r.liquid_actual <= 0) return '-'
        const pct = Math.round(r.liquid_actual / r.liquid_predict * 100)
        const color = pct >= 95 ? '#52c41a' : pct >= 80 ? '#1677ff' : pct >= 60 ? '#fa8c16' : '#ff4d4f'
        return <span style={{ color, fontWeight: 600 }}>{pct}%</span>
      },
    },
    {
      title: '效果评级', dataIndex: 'eval_rating', width: 100, align: 'center',
      render: (v: string) => {
        if (!v) return '-'
        return <Tag color={RATING_COLORS[v]} icon={v === 'excellent' ? <TrophyOutlined /> : undefined}>{RATING_LABELS[v]}</Tag>
      },
    },
    {
      title: '操作', width: 100, fixed: 'right', align: 'center',
      render: (_: unknown, r: OptExecDTO) => {
        if (r.status === 'completed') {
          return <Button type="link" size="small" icon={<StarOutlined />} onClick={() => openEvalModal(r)}>评价</Button>
        }
        if (r.status === 'evaluated') {
          return <Button type="link" size="small" icon={<FundOutlined />} onClick={() => openEvalModal(r)}>查看</Button>
        }
        return <Tag color="processing">监测中</Tag>
      },
    },
  ]

  return (
    <div className="page-container" style={{ padding: 20, background: '#f0f2f5', minHeight: '100%' }}>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={12}>
          <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 140 }}
            options={[
              { value: 'all', label: '全部状态' },
              { value: 'monitoring', label: '监测中' },
              { value: 'completed', label: '已完成' },
              { value: 'evaluated', label: '已评价' },
            ]}
          />
          <RangePicker style={{ width: 260 }} />
          <Button icon={<SyncOutlined />} onClick={loadData} loading={loading}>刷新</Button>
        </Space>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small" hoverable>
            <Statistic title="已完成方案" value={overallStats.completed} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" hoverable>
            <Statistic title="已评价方案" value={overallStats.evaluated} prefix={<StarOutlined style={{ color: '#722ed1' }} />} valueStyle={{ color: '#722ed1' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" hoverable>
            <Statistic title="平均增产量" value={overallStats.totalLiquidIncrease} suffix="m³/d" prefix={<RiseOutlined style={{ color: '#1677ff' }} />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" hoverable>
            <Statistic title="优秀方案数" value={overallStats.excellentCount} prefix={<TrophyOutlined style={{ color: '#eb2f96' }} />} valueStyle={{ color: '#eb2f96' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small">
            {filteredExecs.some(e => e.liquid_actual > 0) ? (
              <ReactECharts option={comparisonChartOption} style={{ height: 340 }} />
            ) : (
              <Empty description="暂无实际产液数据" style={{ padding: 60 }} />
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            <ReactECharts option={trendChartOption} style={{ height: 340 }} />
          </Card>
        </Col>
      </Row>

      <Card title={<Space><FundOutlined />方案效果明细</Space>} size="small">
        <Table<OptExecDTO>
          columns={columns}
          dataSource={filteredExecs}
          rowKey="id"
          size="small"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showTotal: t => `共 ${t} 条` }}
        />
      </Card>

      <Modal
        title="优化效果评价"
        open={evalModal.visible}
        onCancel={() => setEvalModal({ visible: false, exec: null })}
        onOk={doEvaluate}
        okText={evalModal.exec?.status === 'evaluated' ? '更新评价' : '提交评价'}
        width={480}
      >
        {evalModal.exec && (
          <div style={{ fontSize: 13, lineHeight: 2 }}>
            <p><strong>井名：</strong>{evalModal.exec.well_name}</p>
            <p><strong>方案：</strong><Tag color={evalModal.exec.scheme_type === '方案一' ? 'blue' : 'green'}>{evalModal.exec.scheme_type}</Tag>{evalModal.exec.scheme_desc}</p>
            <p><strong>产液量：</strong>{evalModal.exec.liquid_current} → 预测 {evalModal.exec.liquid_predict} → 实际 <span style={{ color: '#52c41a', fontWeight: 600 }}>{evalModal.exec.liquid_actual || '待录入'}</span> m³/d</p>
            {evalModal.exec.liquid_actual > 0 && (
              <p><strong>达标率：</strong><span style={{ fontWeight: 600, color: '#1677ff' }}>{Math.round(evalModal.exec.liquid_actual / evalModal.exec.liquid_predict * 100)}%</span></p>
            )}
            <div style={{ margin: '8px 0' }}>
              <strong>效果评级：</strong>
              <Select value={evalRating || undefined} onChange={setEvalRating} style={{ width: 160, marginLeft: 8 }} placeholder="请选择评级"
                options={[
                  { value: 'excellent', label: '优秀（≥95%）' },
                  { value: 'good', label: '良好（80-95%）' },
                  { value: 'average', label: '一般（60-80%）' },
                  { value: 'below', label: '未达标（<60%）' },
                ]}
              />
            </div>
            <div style={{ margin: '8px 0' }}>
              <strong>评价摘要：</strong>
              <Input.TextArea rows={3} maxLength={500} showCount placeholder="请填写评价摘要"
                value={evalSummary} onChange={e => setEvalSummary(e.target.value)} style={{ marginTop: 4 }} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default OptimizationEffect