import React, { useState, useMemo } from 'react'
import {
  Row, Col, Card, Table, Tag, Statistic, Button, Select, Input, Space,
  Descriptions, Divider, Progress, Modal, message, Tooltip, Empty,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  PlusOutlined, SearchOutlined, FileTextOutlined, EditOutlined,
  AuditOutlined, CheckCircleOutlined, ExportOutlined, BarChartOutlined,
  SwapOutlined, RocketOutlined, SafetyCertificateOutlined,
  DollarOutlined, ToolOutlined, ThunderboltOutlined, RadarChartOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { designSchemes, pumpModelLibrary } from '../../mock/wellData'
import type { DesignScheme, PumpModel } from '../../mock/wellData'

const statusConfig: Record<string, { color: string; label: string }> = {
  designing: { color: 'processing', label: '设计中' },
  reviewed: { color: 'warning', label: '已审核' },
  approved: { color: 'success', label: '已批准' },
  implemented: { color: 'default', label: '已实施' },
}

const pumpTypeColor: Record<string, string> = { ESP: 'blue' }

const generateRadarScores = (scheme: DesignScheme) => {
  const base = scheme.score
  const rand = (min: number, max: number) => Math.round(min + Math.random() * (max - min))
  return {
    safety: Math.min(100, rand(base - 8, base + 5)),
    economy: Math.min(100, rand(base - 10, base + 3)),
    reliability: Math.min(100, rand(base - 5, base + 8)),
    applicability: Math.min(100, rand(base - 6, base + 6)),
    efficiency: Math.min(100, rand(base - 7, base + 4)),
  }
}

const DesignSchemeManager: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [pumpTypeFilter, setPumpTypeFilter] = useState<string>('all')
  const [searchText, setSearchText] = useState('')
  const [selectedScheme, setSelectedScheme] = useState<DesignScheme | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [compareVisible, setCompareVisible] = useState(false)

  const filteredSchemes = useMemo(() => {
    return designSchemes.filter(s => {
      if (statusFilter !== 'all' && s.status !== statusFilter) return false
      if (pumpTypeFilter !== 'all' && s.pumpType !== pumpTypeFilter) return false
      if (searchText) {
        const q = searchText.toLowerCase()
        if (!s.name.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q) && !s.designer.includes(searchText)) return false
      }
      return true
    })
  }, [statusFilter, pumpTypeFilter, searchText])

  const stats = useMemo(() => ({
    total: designSchemes.length,
    designing: designSchemes.filter(s => s.status === 'designing').length,
    reviewed: designSchemes.filter(s => s.status === 'reviewed').length,
    approved: designSchemes.filter(s => s.status === 'approved').length,
    implemented: designSchemes.filter(s => s.status === 'implemented').length,
    avgScore: designSchemes.length > 0 ? Math.round(designSchemes.reduce((sum, s) => sum + s.score, 0) / designSchemes.length * 10) / 10 : 0,
  }), [])

  const selectedPump: PumpModel | undefined = useMemo(() => {
    if (!selectedScheme) return undefined
    return pumpModelLibrary.find(p => p.model === selectedScheme.selectedPump)
  }, [selectedScheme])

  const radarScores = useMemo(() => selectedScheme ? generateRadarScores(selectedScheme) : null, [selectedScheme])

  const handleStatusChange = (scheme: DesignScheme, newStatus: string) => {
    message.success(`方案 ${scheme.name} 状态已更新为「${statusConfig[newStatus]?.label || newStatus}」`)
  }

  const performanceOption = useMemo(() => {
    if (!selectedPump) return null
    return {
      tooltip: {
        trigger: 'axis',
        formatter: (params: any[]) => {
          let s = `排量: ${params[0].axisValue} m³/d<br/>`
          params.forEach((p: any) => {
            s += `${p.marker} ${p.seriesName}: ${p.value} ${p.seriesName.includes('扬程') ? 'm' : p.seriesName.includes('效率') ? '%' : 'kW'}<br/>`
          })
          return s
        },
      },
      legend: { data: ['扬程(m)', '效率(%)', '功率(kW)'], bottom: 0 },
      grid: { top: 30, right: 80, bottom: 50, left: 60 },
      xAxis: {
        type: 'category',
        data: selectedPump.performanceCurve.map(p => p.flow),
        name: '排量(m³/d)',
        nameLocation: 'center',
        nameGap: 30,
      },
      yAxis: [
        { type: 'value', name: '扬程(m)', position: 'left', axisLine: { lineStyle: { color: '#1677ff' } } },
        { type: 'value', name: '效率(%)', position: 'right', axisLine: { lineStyle: { color: '#52c41a' } } },
        { type: 'value', name: '功率(kW)', position: 'right', offset: 50, axisLine: { lineStyle: { color: '#ff4d4f' } } },
      ],
      series: [
        {
          name: '扬程(m)', type: 'line', smooth: true, yAxisIndex: 0,
          data: selectedPump.performanceCurve.map(p => p.head),
          lineStyle: { width: 3, color: '#1677ff' }, itemStyle: { color: '#1677ff' },
          symbol: 'circle', symbolSize: 6,
          markLine: selectedScheme ? {
            data: [{ xAxis: selectedScheme.targetProduction, name: '目标排量' }],
            label: { formatter: '目标排量' }, lineStyle: { color: '#fa8c16', type: 'dashed' },
          } : undefined,
        },
        {
          name: '效率(%)', type: 'line', smooth: true, yAxisIndex: 1,
          data: selectedPump.performanceCurve.map(p => p.efficiency),
          lineStyle: { width: 3, color: '#52c41a' }, itemStyle: { color: '#52c41a' },
          symbol: 'diamond', symbolSize: 6,
        },
        {
          name: '功率(kW)', type: 'line', smooth: true, yAxisIndex: 2,
          data: selectedPump.performanceCurve.map(p => p.power),
          lineStyle: { width: 3, color: '#ff4d4f' }, itemStyle: { color: '#ff4d4f' },
          symbol: 'triangle', symbolSize: 6,
        },
      ],
    }
  }, [selectedPump, selectedScheme])

  const radarOption = useMemo(() => {
    if (!radarScores) return null
    return {
      tooltip: {},
      radar: {
        indicator: [
          { name: '安全性', max: 100 },
          { name: '经济性', max: 100 },
          { name: '可靠性', max: 100 },
          { name: '适用性', max: 100 },
          { name: '效率', max: 100 },
        ],
        shape: 'polygon',
        splitNumber: 5,
        axisName: { color: '#595959', fontSize: 12 },
      },
      series: [{
        type: 'radar',
        data: [{
          value: [radarScores.safety, radarScores.economy, radarScores.reliability, radarScores.applicability, radarScores.efficiency],
          name: selectedScheme?.name || '',
          areaStyle: { opacity: 0.25, color: '#1677ff' },
          lineStyle: { color: '#1677ff', width: 2 },
          itemStyle: { color: '#1677ff' },
        }],
      }],
    }
  }, [radarScores, selectedScheme])

  const compareSchemes = useMemo(() => compareIds.map(id => designSchemes.find(s => s.id === id)).filter(Boolean) as DesignScheme[], [compareIds])

  const compareBarOption = useMemo(() => {
    if (compareSchemes.length === 0) return null
    const colors = ['#1677ff', '#52c41a', '#ff4d4f']
    const allScores = compareSchemes.map(s => generateRadarScores(s))
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: compareSchemes.map(s => s.name), bottom: 0 },
      grid: { top: 30, right: 20, bottom: 50, left: 60 },
      xAxis: { type: 'category', data: ['安全性', '经济性', '可靠性', '适用性', '效率', '综合评分'] },
      yAxis: { type: 'value', name: '分数', max: 100 },
      series: compareSchemes.map((s, i) => ({
        name: s.name,
        type: 'bar',
        barWidth: 20,
        data: [allScores[i].safety, allScores[i].economy, allScores[i].reliability, allScores[i].applicability, allScores[i].efficiency, s.score],
        itemStyle: { color: colors[i % colors.length] },
      })),
    }
  }, [compareSchemes])

  const compareTableData = useMemo(() => {
    if (compareSchemes.length === 0) return []
    const fields: { key: string; label: string }[] = [
      { key: 'id', label: '方案ID' },
      { key: 'wellDepth', label: '井深 (m)' },
      { key: 'pumpType', label: '泵型' },
      { key: 'targetProduction', label: '目标产量 (m³/d)' },
      { key: 'targetHead', label: '目标扬程 (m)' },
      { key: 'selectedPump', label: '选用泵型' },
      { key: 'status', label: '状态' },
      { key: 'designer', label: '设计人' },
      { key: 'score', label: '评分' },
      { key: 'createTime', label: '创建时间' },
    ]
    return fields.map(f => {
      const row: Record<string, any> = { param: f.label }
      compareSchemes.forEach((s, i) => {
        let val: any = (s as any)[f.key]
        if (f.key === 'status') val = statusConfig[val]?.label || val
        row[`s${i}`] = val
      })
      return row
    })
  }, [compareSchemes])

  const compareTableColumns: ColumnsType<any> = [
    { title: '参数', dataIndex: 'param', width: 140, render: v => <span style={{ fontWeight: 500 }}>{v}</span> },
    ...compareSchemes.map((s, i) => ({
      title: s.name,
      dataIndex: `s${i}`,
      align: 'center' as const,
      render: (v: any) => {
        if (typeof v === 'number') return v.toLocaleString()
        return v
      },
    })),
  ]

  const columns: ColumnsType<DesignScheme> = [
    { title: '方案ID', dataIndex: 'id', width: 90, sorter: (a, b) => a.id.localeCompare(b.id) },
    { title: '名称', dataIndex: 'name', width: 200, ellipsis: true },
    { title: '井深(m)', dataIndex: 'wellDepth', width: 90, sorter: (a, b) => a.wellDepth - b.wellDepth, align: 'right' },
    {
      title: '泵型', dataIndex: 'pumpType', width: 80, align: 'center',
      render: (v: string) => <Tag color={pumpTypeColor[v]}>{v}</Tag>,
    },
    { title: '目标产量', dataIndex: 'targetProduction', width: 100, align: 'right', render: (v: number) => `${v} m³/d`, sorter: (a, b) => a.targetProduction - b.targetProduction },
    { title: '目标扬程', dataIndex: 'targetHead', width: 100, align: 'right', render: (v: number) => `${v} m`, sorter: (a, b) => a.targetHead - b.targetHead },
    { title: '选用泵型', dataIndex: 'selectedPump', width: 120 },
    {
      title: '状态', dataIndex: 'status', width: 90, align: 'center',
      render: (v: string) => {
        const cfg = statusConfig[v]
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : v
      },
      filters: Object.entries(statusConfig).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (value, record) => record.status === value,
    },
    { title: '设计人', dataIndex: 'designer', width: 80 },
    {
      title: '评分', dataIndex: 'score', width: 120, sorter: (a, b) => a.score - b.score,
      render: (v: number) => (
        <Progress
          percent={v}
          size="small"
          strokeColor={v >= 90 ? '#52c41a' : v >= 80 ? '#1677ff' : v >= 70 ? '#faad14' : '#ff4d4f'}
          format={p => <span style={{ fontSize: 12 }}>{p}</span>}
        />
      ),
    },
    { title: '创建时间', dataIndex: 'createTime', width: 110, sorter: (a, b) => a.createTime.localeCompare(b.createTime) },
    {
      title: '操作', width: 240, fixed: 'right',
      render: (_, record) => (
        <Space size={4}>
          <Button type="link" size="small" icon={<FileTextOutlined />} onClick={() => setSelectedScheme(record)}>查看</Button>
          {record.status === 'designing' && (
            <Button type="link" size="small" icon={<EditOutlined />}>编辑</Button>
          )}
          {record.status === 'designing' && (
            <Button type="link" size="small" icon={<AuditOutlined />} onClick={() => handleStatusChange(record, 'reviewed')}>提交审核</Button>
          )}
          {record.status === 'reviewed' && (
            <Button type="link" size="small" icon={<CheckCircleOutlined />} onClick={() => handleStatusChange(record, 'approved')}>批准</Button>
          )}
          <Tooltip title="导出报告">
            <Button type="link" size="small" icon={<ExportOutlined />} onClick={() => message.info(`导出方案 ${record.name} 报告`)} />
          </Tooltip>
        </Space>
      ),
    },
  ]

  const statusSteps = [
    { key: 'designing', label: '设计中', icon: <EditOutlined /> },
    { key: 'reviewed', label: '已审核', icon: <AuditOutlined /> },
    { key: 'approved', label: '已批准', icon: <CheckCircleOutlined /> },
    { key: 'implemented', label: '已实施', icon: <RocketOutlined /> },
  ]
  const currentStep = selectedScheme ? statusSteps.findIndex(s => s.key === selectedScheme.status) : -1

  return (
    <div className="page-container">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Space style={{ width: '100%', flexWrap: 'wrap' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => message.info('新建设计方案')}>新建设计</Button>
            <Button icon={<SwapOutlined />} onClick={() => { setCompareIds([]); setCompareVisible(true) }}>方案对比</Button>
          </Space>
        </Col>
        <Col xs={24} sm={12} md={16}>
          <Space style={{ width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 120 }}
              options={[{ value: 'all', label: '全部状态' }, ...Object.entries(statusConfig).map(([k, v]) => ({ value: k, label: v.label }))]}
            />
            <Select value={pumpTypeFilter} onChange={setPumpTypeFilter} style={{ width: 120 }}
              options={[{ value: 'all', label: '全部泵型' }, { value: 'ESP', label: 'ESP' }]}
            />
            <Input placeholder="搜索名称/ID/设计人" prefix={<SearchOutlined />} style={{ width: 200 }} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
          </Space>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {[
          { title: '方案总数', value: stats.total, icon: <FileTextOutlined />, color: '#1677ff', suffix: '个' },
          { title: '设计中', value: stats.designing, icon: <EditOutlined />, color: '#1677ff', suffix: '个' },
          { title: '已审核', value: stats.reviewed, icon: <AuditOutlined />, color: '#fa8c16', suffix: '个' },
          { title: '已批准', value: stats.approved, icon: <CheckCircleOutlined />, color: '#52c41a', suffix: '个' },
          { title: '已实施', value: stats.implemented, icon: <RocketOutlined />, color: '#722ed1', suffix: '个' },
          { title: '平均评分', value: stats.avgScore, icon: <BarChartOutlined />, color: '#13c2c2', suffix: '分' },
        ].map(item => (
          <Col xs={12} sm={8} md={4} key={item.title}>
            <Card hoverable size="small">
              <Statistic title={item.title} value={item.value} suffix={item.suffix} prefix={item.icon} valueStyle={{ color: item.color, fontWeight: 600, fontSize: 22 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="设计方案列表" style={{ marginTop: 16 }}>
        <Table
          columns={columns}
          dataSource={filteredSchemes}
          rowKey="id"
          size="middle"
          scroll={{ x: 1400 }}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: t => `共 ${t} 条` }}
          onRow={(record) => ({
            onClick: () => setSelectedScheme(record),
            style: { cursor: 'pointer', background: selectedScheme?.id === record.id ? '#e6f4ff' : undefined },
          })}
        />
      </Card>

      {selectedScheme && (
        <Card
          title={<Space><FileTextOutlined />方案详情 — {selectedScheme.name}</Space>}
          style={{ marginTop: 16 }}
        >
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#8c8c8c', marginBottom: 8 }}>方案状态流转</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {statusSteps.map((step, idx) => (
                <React.Fragment key={step.key}>
                  <Tag
                    color={idx <= currentStep ? '#1677ff' : undefined}
                    icon={step.icon}
                    style={{ padding: '4px 12px', fontSize: 13 }}
                  >
                    {step.label}
                  </Tag>
                  {idx < statusSteps.length - 1 && (
                    <span style={{ color: idx < currentStep ? '#1677ff' : '#d9d9d9', fontSize: 16 }}>→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          <Divider orientation="left">基本信息</Divider>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3, lg: 4 }}>
            <Descriptions.Item label="方案ID">{selectedScheme.id}</Descriptions.Item>
            <Descriptions.Item label="方案名称">{selectedScheme.name}</Descriptions.Item>
            <Descriptions.Item label="创建时间">{selectedScheme.createTime}</Descriptions.Item>
            <Descriptions.Item label="设计人">{selectedScheme.designer}</Descriptions.Item>
            <Descriptions.Item label="井深">{selectedScheme.wellDepth} m</Descriptions.Item>
            <Descriptions.Item label="泵型"><Tag color={pumpTypeColor[selectedScheme.pumpType]}>{selectedScheme.pumpType}</Tag></Descriptions.Item>
            <Descriptions.Item label="目标产量">{selectedScheme.targetProduction} m³/d</Descriptions.Item>
            <Descriptions.Item label="目标扬程">{selectedScheme.targetHead} m</Descriptions.Item>
            <Descriptions.Item label="选用泵型">{selectedScheme.selectedPump}</Descriptions.Item>
            <Descriptions.Item label="评分"><Progress percent={selectedScheme.score} size="small" style={{ width: 120 }} /></Descriptions.Item>
            <Descriptions.Item label="状态"><Tag color={statusConfig[selectedScheme.status]?.color}>{statusConfig[selectedScheme.status]?.label}</Tag></Descriptions.Item>
          </Descriptions>

          <Divider orientation="left">设计参数汇总</Divider>
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3 }}>
            {Object.entries(selectedScheme.designParams).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>{String(value)}</Descriptions.Item>
            ))}
          </Descriptions>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col xs={24} lg={14}>
              <Card type="inner" size="small" title={<Space><ThunderboltOutlined />选用泵型性能曲线 — {selectedScheme.selectedPump}</Space>}>
                {performanceOption ? (
                  <ReactECharts option={performanceOption} style={{ height: 360 }} />
                ) : (
                  <Empty description="未找到对应泵型性能数据" />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card type="inner" size="small" title={<Space><RadarChartOutlined />设计评分雷达图</Space>}>
                {radarOption ? (
                  <>
                    <ReactECharts option={radarOption} style={{ height: 300 }} />
                    <Row gutter={[8, 4]} style={{ padding: '0 16px' }}>
                      {[
                        { label: '安全性', value: radarScores!.safety, icon: <SafetyCertificateOutlined />, color: '#1677ff' },
                        { label: '经济性', value: radarScores!.economy, icon: <DollarOutlined />, color: '#52c41a' },
                        { label: '可靠性', value: radarScores!.reliability, icon: <ToolOutlined />, color: '#fa8c16' },
                        { label: '适用性', value: radarScores!.applicability, icon: <CheckCircleOutlined />, color: '#722ed1' },
                        { label: '效率', value: radarScores!.efficiency, icon: <ThunderboltOutlined />, color: '#13c2c2' },
                      ].map(item => (
                        <Col span={12} key={item.label}>
                          <Space size={4}>
                            <span style={{ color: item.color }}>{item.icon}</span>
                            <span style={{ fontSize: 12 }}>{item.label}:</span>
                            <span style={{ fontSize: 13, fontWeight: 600, color: item.color }}>{item.value}</span>
                          </Space>
                        </Col>
                      ))}
                    </Row>
                  </>
                ) : (
                  <Empty description="无评分数据" />
                )}
              </Card>
            </Col>
          </Row>
        </Card>
      )}

      <Modal
        title={<Space><SwapOutlined />方案对比</Space>}
        open={compareVisible}
        onCancel={() => setCompareVisible(false)}
        width={1000}
        footer={null}
      >
        <div style={{ marginBottom: 16 }}>
          <span style={{ marginRight: 8 }}>选择对比方案（2~3个）：</span>
          <Select
            mode="multiple"
            style={{ width: 500 }}
            value={compareIds}
            onChange={(vals) => setCompareIds(vals.slice(0, 3))}
            maxCount={3}
            placeholder="请选择2~3个方案进行对比"
            options={designSchemes.map(s => ({ value: s.id, label: `${s.id} - ${s.name}` }))}
          />
        </div>

        {compareSchemes.length >= 2 ? (
          <>
            <Divider orientation="left">参数对比表格</Divider>
            <Table
              columns={compareTableColumns}
              dataSource={compareTableData}
              rowKey="param"
              size="small"
              pagination={false}
              bordered
            />

            <Divider orientation="left">评分对比柱状图</Divider>
            {compareBarOption && <ReactECharts option={compareBarOption} style={{ height: 350 }} />}
          </>
        ) : (
          <Empty description="请选择至少2个方案进行对比" style={{ padding: 40 }} />
        )}
      </Modal>
    </div>
  )
}

export default DesignSchemeManager
