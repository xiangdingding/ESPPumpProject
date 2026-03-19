import React, { useState, useMemo } from 'react'
import {
  Row, Col, Card, Tag, Tabs, Input, Select, Slider, Button, Form, InputNumber,
  Descriptions, Table, Progress, Space, Empty, Badge, Divider, Tooltip,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  SearchOutlined, ExperimentOutlined, DatabaseOutlined,
  ThunderboltOutlined, SafetyCertificateOutlined, BarChartOutlined,
  SwapOutlined, CheckCircleOutlined, InfoCircleOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { pumpModelLibrary } from '../../mock/wellData'
import type { PumpModel } from '../../mock/wellData'

const typeColorMap: Record<string, string> = { ESP: 'blue' }

const buildPerformanceOption = (pump: PumpModel, title?: string) => ({
  title: title ? { text: title, left: 'center', textStyle: { fontSize: 14 } } : undefined,
  tooltip: {
    trigger: 'axis',
    formatter: (params: any[]) => {
      let s = `排量: ${params[0].axisValue} m³/d<br/>`
      params.forEach((p: any) => { s += `${p.marker} ${p.seriesName}: ${p.value} ${p.seriesName.includes('扬程') ? 'm' : p.seriesName.includes('效率') ? '%' : 'kW'}<br/>` })
      return s
    },
  },
  legend: { data: ['扬程(m)', '效率(%)', '功率(kW)'], bottom: 0 },
  grid: { top: title ? 45 : 30, right: 80, bottom: 50, left: 60 },
  xAxis: {
    type: 'category',
    data: pump.performanceCurve.map(p => p.flow),
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
      data: pump.performanceCurve.map(p => p.head),
      lineStyle: { width: 3, color: '#1677ff' },
      itemStyle: { color: '#1677ff' },
      symbol: 'circle', symbolSize: 6,
    },
    {
      name: '效率(%)', type: 'line', smooth: true, yAxisIndex: 1,
      data: pump.performanceCurve.map(p => p.efficiency),
      lineStyle: { width: 3, color: '#52c41a' },
      itemStyle: { color: '#52c41a' },
      symbol: 'diamond', symbolSize: 6,
    },
    {
      name: '功率(kW)', type: 'line', smooth: true, yAxisIndex: 2,
      data: pump.performanceCurve.map(p => p.power),
      lineStyle: { width: 3, color: '#ff4d4f' },
      itemStyle: { color: '#ff4d4f' },
      symbol: 'triangle', symbolSize: 6,
    },
  ],
})

const PumpSelection: React.FC = () => {
  const [activeTab, setActiveTab] = useState('library')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [mfgFilter, setMfgFilter] = useState<string>('all')
  const [displacementRange, setDisplacementRange] = useState<[number, number]>([0, 200])
  const [headRange, setHeadRange] = useState<[number, number]>([0, 3500])
  const [searchText, setSearchText] = useState('')
  const [selectedPump, setSelectedPump] = useState<PumpModel | null>(null)
  const [comparePumpId, setComparePumpId] = useState<string | null>(null)
  const [form] = Form.useForm()
  const [selectionResults, setSelectionResults] = useState<{ pump: PumpModel; score: number; reasons: string[] }[]>([])

  const manufacturers = useMemo(() => [...new Set(pumpModelLibrary.map(p => p.manufacturer))], [])

  const filteredPumps = useMemo(() => {
    return pumpModelLibrary.filter(p => {
      if (typeFilter !== 'all' && p.type !== typeFilter) return false
      if (mfgFilter !== 'all' && p.manufacturer !== mfgFilter) return false
      if (p.ratedDisplacement < displacementRange[0] || p.ratedDisplacement > displacementRange[1]) return false
      if (p.ratedHead < headRange[0] || p.ratedHead > headRange[1]) return false
      if (searchText && !p.model.toLowerCase().includes(searchText.toLowerCase()) && !p.series.includes(searchText)) return false
      return true
    })
  }, [typeFilter, mfgFilter, displacementRange, headRange, searchText])

  const comparePump = useMemo(() => comparePumpId ? pumpModelLibrary.find(p => p.id === comparePumpId) : null, [comparePumpId])

  const handleSmartSelection = () => {
    const values = form.getFieldsValue()
    const { wellDepth, targetDisplacement, targetHead, wellTemp, gasContent, sandContent, casingDiameter, pumpPreference } = values

    const results = pumpModelLibrary
      .filter(p => {
        if (pumpPreference && pumpPreference !== 'any' && p.type !== pumpPreference) return false
        return true
      })
      .map(p => {
        let score = 100
        const reasons: string[] = []

        if (wellDepth !== undefined) {
          if (wellDepth >= p.applicableDepth[0] && wellDepth <= p.applicableDepth[1]) {
            reasons.push('井深在适用范围内')
          } else {
            const dist = wellDepth < p.applicableDepth[0] ? p.applicableDepth[0] - wellDepth : wellDepth - p.applicableDepth[1]
            score -= Math.min(30, dist / 50)
            reasons.push(`井深偏离适用范围${Math.round(dist)}m`)
          }
        }

        if (targetDisplacement !== undefined) {
          if (targetDisplacement >= p.applicableProduction[0] && targetDisplacement <= p.applicableProduction[1]) {
            const ratio = Math.abs(targetDisplacement - p.ratedDisplacement) / p.ratedDisplacement
            score -= ratio * 15
            reasons.push('目标排量在适用范围内')
          } else {
            score -= 25
            reasons.push('目标排量超出适用范围')
          }
        }

        if (targetHead !== undefined) {
          const headRatio = Math.abs(targetHead - p.ratedHead) / p.ratedHead
          if (headRatio < 0.1) {
            reasons.push('扬程匹配度高')
          } else if (headRatio < 0.3) {
            score -= headRatio * 20
            reasons.push('扬程基本匹配')
          } else {
            score -= 20
            reasons.push('扬程偏差较大')
          }
        }

        if (wellTemp !== undefined && wellTemp > p.maxTemperature) {
          score -= 20
          reasons.push(`井温超过泵最高耐温${p.maxTemperature}°C`)
        } else if (wellTemp !== undefined) {
          reasons.push('井温满足要求')
        }

        if (gasContent !== undefined && gasContent > p.maxGasContent) {
          score -= 15
          reasons.push(`含气量超过泵最大允许值${p.maxGasContent}%`)
        } else if (gasContent !== undefined) {
          reasons.push('含气量满足要求')
        }

        if (sandContent !== undefined && sandContent > p.maxSandContent) {
          score -= 15
          reasons.push(`含砂量超过泵最大允许值${p.maxSandContent}%`)
        } else if (sandContent !== undefined) {
          reasons.push('含砂量满足要求')
        }

        if (casingDiameter !== undefined && p.outerDiameter >= casingDiameter) {
          score -= 30
          reasons.push('泵外径超过套管内径')
        }

        score += p.ratedEfficiency * 0.1
        score += Math.min(10, p.mtbf / 100)

        return { pump: p, score: Math.max(0, Math.min(100, Math.round(score))), reasons }
      })
      .sort((a, b) => b.score - a.score)

    setSelectionResults(results)
  }

  const overlayChartOption = useMemo(() => {
    if (selectionResults.length === 0) return null
    const top3 = selectionResults.slice(0, 3)
    const colors = ['#1677ff', '#52c41a', '#ff4d4f']
    const allFlows = new Set<number>()
    top3.forEach(r => r.pump.performanceCurve.forEach(p => allFlows.add(p.flow)))
    const flows = [...allFlows].sort((a, b) => a - b)

    return {
      tooltip: { trigger: 'axis' },
      legend: { data: top3.map(r => r.pump.model), bottom: 0 },
      grid: { top: 30, right: 60, bottom: 50, left: 60 },
      xAxis: { type: 'category', data: flows, name: '排量(m³/d)' },
      yAxis: [
        { type: 'value', name: '扬程(m)', position: 'left' },
        { type: 'value', name: '效率(%)', position: 'right' },
      ],
      series: top3.flatMap((r, i) => {
        const headMap = new Map(r.pump.performanceCurve.map(p => [p.flow, p.head]))
        const effMap = new Map(r.pump.performanceCurve.map(p => [p.flow, p.efficiency]))
        return [
          {
            name: r.pump.model, type: 'line', smooth: true, yAxisIndex: 0,
            data: flows.map(f => headMap.get(f) ?? null),
            lineStyle: { width: 2, color: colors[i] },
            itemStyle: { color: colors[i] },
            connectNulls: true,
          },
          {
            name: r.pump.model + '-效率', type: 'line', smooth: true, yAxisIndex: 1,
            data: flows.map(f => effMap.get(f) ?? null),
            lineStyle: { width: 2, color: colors[i], type: 'dashed' },
            itemStyle: { color: colors[i] },
            connectNulls: true,
            showInLegend: false,
          },
        ]
      }),
    }
  }, [selectionResults])

  const compareColumns: ColumnsType<{ param: string; value1: string | number; value2: string | number }> = [
    { title: '参数', dataIndex: 'param', width: 160, render: v => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: selectedPump?.model || '-', dataIndex: 'value1', align: 'center' },
    { title: comparePump?.model || '-', dataIndex: 'value2', align: 'center' },
  ]

  const compareData = useMemo(() => {
    if (!selectedPump || !comparePump) return []
    const fields: { key: string; label: string; unit: string }[] = [
      { key: 'type', label: '泵型', unit: '' },
      { key: 'series', label: '系列', unit: '' },
      { key: 'manufacturer', label: '厂家', unit: '' },
      { key: 'ratedDisplacement', label: '额定排量', unit: 'm³/d' },
      { key: 'ratedHead', label: '额定扬程', unit: 'm' },
      { key: 'ratedPower', label: '额定功率', unit: 'kW' },
      { key: 'ratedEfficiency', label: '额定效率', unit: '%' },
      { key: 'stages', label: '级数', unit: '级' },
      { key: 'outerDiameter', label: '外径', unit: 'mm' },
      { key: 'maxTemperature', label: '最高耐温', unit: '°C' },
      { key: 'maxGasContent', label: '最大含气量', unit: '%' },
      { key: 'maxSandContent', label: '最大含砂量', unit: '%' },
      { key: 'minSubmergence', label: '最小沉没度', unit: 'm' },
      { key: 'price', label: '价格', unit: '元' },
      { key: 'mtbf', label: 'MTBF', unit: '天' },
    ]
    return fields.map(f => {
      const v1 = (selectedPump as any)[f.key]
      const v2 = (comparePump as any)[f.key]
      return {
        param: f.label + (f.unit ? ` (${f.unit})` : ''),
        value1: typeof v1 === 'number' ? v1.toLocaleString() : v1,
        value2: typeof v2 === 'number' ? v2.toLocaleString() : v2,
      }
    })
  }, [selectedPump, comparePump])

  const renderPumpCard = (pump: PumpModel) => (
    <Col xs={24} sm={12} md={8} lg={6} key={pump.id}>
      <Badge.Ribbon text={pump.type} color={typeColorMap[pump.type]}>
        <Card
          hoverable
          size="small"
          style={{
            borderColor: selectedPump?.id === pump.id ? '#1677ff' : undefined,
            borderWidth: selectedPump?.id === pump.id ? 2 : 1,
          }}
          onClick={() => { setSelectedPump(pump); setComparePumpId(null) }}
        >
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1d1d1d' }}>{pump.model}</div>
            <div style={{ fontSize: 12, color: '#8c8c8c' }}>{pump.series} · {pump.manufacturer}</div>
          </div>
          <Row gutter={[8, 4]} style={{ fontSize: 12 }}>
            <Col span={12}><span style={{ color: '#8c8c8c' }}>排量:</span> {pump.ratedDisplacement} m³/d</Col>
            <Col span={12}><span style={{ color: '#8c8c8c' }}>扬程:</span> {pump.ratedHead} m</Col>
            <Col span={12}><span style={{ color: '#8c8c8c' }}>功率:</span> {pump.ratedPower} kW</Col>
            <Col span={12}><span style={{ color: '#8c8c8c' }}>效率:</span> {pump.ratedEfficiency}%</Col>
            <Col span={24}><span style={{ color: '#8c8c8c' }}>深度:</span> {pump.applicableDepth[0]}~{pump.applicableDepth[1]} m</Col>
            <Col span={24}><span style={{ color: '#8c8c8c' }}>产量:</span> {pump.applicableProduction[0]}~{pump.applicableProduction[1]} m³/d</Col>
          </Row>
          <Divider style={{ margin: '8px 0' }} />
          <Row gutter={8} style={{ fontSize: 12 }}>
            <Col span={12}>
              <Tooltip title="平均无故障运行时间">
                <SafetyCertificateOutlined style={{ color: '#52c41a', marginRight: 4 }} />
                MTBF: {pump.mtbf}天
              </Tooltip>
            </Col>
            <Col span={12} style={{ textAlign: 'right', color: '#fa8c16' }}>
              ¥{(pump.price / 10000).toFixed(1)}万
            </Col>
          </Row>
        </Card>
      </Badge.Ribbon>
    </Col>
  )

  const renderLibraryTab = () => (
    <>
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={6} md={4}>
            <Select value={typeFilter} onChange={setTypeFilter} style={{ width: '100%' }}
              options={[{ value: 'all', label: '全部泵型' }, { value: 'ESP', label: 'ESP 电潜泵' }]}
            />
          </Col>
          <Col xs={24} sm={6} md={4}>
            <Select value={mfgFilter} onChange={setMfgFilter} style={{ width: '100%' }}
              options={[{ value: 'all', label: '全部厂家' }, ...manufacturers.map(m => ({ value: m, label: m }))]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 2 }}>排量范围 (m³/d)</div>
            <Slider range min={0} max={200} value={displacementRange} onChange={v => setDisplacementRange(v as [number, number])} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 2 }}>扬程范围 (m)</div>
            <Slider range min={0} max={3500} step={100} value={headRange} onChange={v => setHeadRange(v as [number, number])} />
          </Col>
          <Col xs={24} sm={6} md={4}>
            <Input placeholder="搜索型号/系列" prefix={<SearchOutlined />} value={searchText} onChange={e => setSearchText(e.target.value)} allowClear />
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {filteredPumps.length > 0 ? filteredPumps.map(renderPumpCard) : (
          <Col span={24}><Empty description="没有匹配的泵型" /></Col>
        )}
      </Row>

      {selectedPump && (
        <Card
          title={<Space><BarChartOutlined />泵型详情 — {selectedPump.model}</Space>}
          style={{ marginTop: 16 }}
          extra={
            <Space>
              <span style={{ fontSize: 13 }}>对比泵型：</span>
              <Select
                style={{ width: 200 }}
                placeholder="选择对比泵型"
                allowClear
                value={comparePumpId}
                onChange={setComparePumpId}
                options={pumpModelLibrary.filter(p => p.id !== selectedPump.id).map(p => ({ value: p.id, label: `${p.model} (${p.type})` }))}
              />
            </Space>
          }
        >
          <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3, lg: 4 }}>
            <Descriptions.Item label="型号">{selectedPump.model}</Descriptions.Item>
            <Descriptions.Item label="系列">{selectedPump.series}</Descriptions.Item>
            <Descriptions.Item label="类型"><Tag color={typeColorMap[selectedPump.type]}>{selectedPump.type}</Tag></Descriptions.Item>
            <Descriptions.Item label="厂家">{selectedPump.manufacturer}</Descriptions.Item>
            <Descriptions.Item label="额定排量">{selectedPump.ratedDisplacement} m³/d</Descriptions.Item>
            <Descriptions.Item label="额定扬程">{selectedPump.ratedHead} m</Descriptions.Item>
            <Descriptions.Item label="额定功率">{selectedPump.ratedPower} kW</Descriptions.Item>
            <Descriptions.Item label="额定效率">{selectedPump.ratedEfficiency}%</Descriptions.Item>
            <Descriptions.Item label="级数">{selectedPump.stages} 级</Descriptions.Item>
            <Descriptions.Item label="外径">{selectedPump.outerDiameter} mm</Descriptions.Item>
            <Descriptions.Item label="最高耐温">{selectedPump.maxTemperature} °C</Descriptions.Item>
            <Descriptions.Item label="最大含气量">{selectedPump.maxGasContent}%</Descriptions.Item>
            <Descriptions.Item label="最大含砂量">{selectedPump.maxSandContent}%</Descriptions.Item>
            <Descriptions.Item label="最小沉没度">{selectedPump.minSubmergence} m</Descriptions.Item>
            <Descriptions.Item label="适用深度">{selectedPump.applicableDepth[0]} ~ {selectedPump.applicableDepth[1]} m</Descriptions.Item>
            <Descriptions.Item label="适用产量">{selectedPump.applicableProduction[0]} ~ {selectedPump.applicableProduction[1]} m³/d</Descriptions.Item>
            <Descriptions.Item label="MTBF">{selectedPump.mtbf} 天</Descriptions.Item>
            <Descriptions.Item label="价格">¥{selectedPump.price.toLocaleString()}</Descriptions.Item>
          </Descriptions>

          <Divider orientation="left">泵性能曲线</Divider>
          <ReactECharts option={buildPerformanceOption(selectedPump)} style={{ height: 380 }} />

          <Divider orientation="left">适用工况说明</Divider>
          <Row gutter={[16, 8]}>
            <Col xs={24} md={8}>
              <Card type="inner" size="small" title="温度与介质">
                <p>最高工作温度：<strong>{selectedPump.maxTemperature}°C</strong></p>
                <p>最大允许含气量：<strong>{selectedPump.maxGasContent}%</strong></p>
                <p>最大允许含砂量：<strong>{selectedPump.maxSandContent}%</strong></p>
                <p>最小沉没度要求：<strong>{selectedPump.minSubmergence}m</strong></p>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card type="inner" size="small" title="适用范围">
                <p>适用井深：<strong>{selectedPump.applicableDepth[0]}~{selectedPump.applicableDepth[1]}m</strong></p>
                <p>适用产量：<strong>{selectedPump.applicableProduction[0]}~{selectedPump.applicableProduction[1]} m³/d</strong></p>
                <p>额定工况排量：<strong>{selectedPump.ratedDisplacement} m³/d</strong></p>
                <p>额定工况扬程：<strong>{selectedPump.ratedHead} m</strong></p>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card type="inner" size="small" title="可靠性与经济性">
                <p>平均无故障时间(MTBF)：<strong>{selectedPump.mtbf}天</strong></p>
                <p>设备价格：<strong>¥{selectedPump.price.toLocaleString()}</strong></p>
                <p>泵型级数：<strong>{selectedPump.stages}级</strong></p>
                <p>类型：<Tag color={typeColorMap[selectedPump.type]}>电潜泵</Tag></p>
              </Card>
            </Col>
          </Row>

          {comparePump && (
            <>
              <Divider orientation="left"><SwapOutlined /> 泵型对比：{selectedPump.model} vs {comparePump.model}</Divider>
              <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                  <Table
                    columns={compareColumns}
                    dataSource={compareData}
                    rowKey="param"
                    size="small"
                    pagination={false}
                    bordered
                  />
                </Col>
                <Col xs={24} lg={12}>
                  <Card type="inner" size="small" title="性能曲线对比">
                    <ReactECharts
                      style={{ height: 350 }}
                      option={{
                        tooltip: { trigger: 'axis' },
                        legend: { data: [`${selectedPump.model}-扬程`, `${comparePump.model}-扬程`, `${selectedPump.model}-效率`, `${comparePump.model}-效率`], bottom: 0, textStyle: { fontSize: 11 } },
                        grid: { top: 30, right: 60, bottom: 55, left: 60 },
                        xAxis: { type: 'category', data: [...new Set([...selectedPump.performanceCurve.map(p => p.flow), ...comparePump.performanceCurve.map(p => p.flow)])].sort((a, b) => a - b), name: '排量(m³/d)' },
                        yAxis: [
                          { type: 'value', name: '扬程(m)', position: 'left' },
                          { type: 'value', name: '效率(%)', position: 'right' },
                        ],
                        series: [
                          { name: `${selectedPump.model}-扬程`, type: 'line', smooth: true, data: (() => { const m = new Map(selectedPump.performanceCurve.map(p => [p.flow, p.head])); return [...new Set([...selectedPump.performanceCurve.map(p => p.flow), ...comparePump.performanceCurve.map(p => p.flow)])].sort((a, b) => a - b).map(f => m.get(f) ?? null) })(), lineStyle: { color: '#1677ff', width: 2 }, itemStyle: { color: '#1677ff' }, connectNulls: true },
                          { name: `${comparePump.model}-扬程`, type: 'line', smooth: true, data: (() => { const m = new Map(comparePump.performanceCurve.map(p => [p.flow, p.head])); return [...new Set([...selectedPump.performanceCurve.map(p => p.flow), ...comparePump.performanceCurve.map(p => p.flow)])].sort((a, b) => a - b).map(f => m.get(f) ?? null) })(), lineStyle: { color: '#ff4d4f', width: 2 }, itemStyle: { color: '#ff4d4f' }, connectNulls: true },
                          { name: `${selectedPump.model}-效率`, type: 'line', smooth: true, yAxisIndex: 1, data: (() => { const m = new Map(selectedPump.performanceCurve.map(p => [p.flow, p.efficiency])); return [...new Set([...selectedPump.performanceCurve.map(p => p.flow), ...comparePump.performanceCurve.map(p => p.flow)])].sort((a, b) => a - b).map(f => m.get(f) ?? null) })(), lineStyle: { color: '#1677ff', width: 2, type: 'dashed' }, itemStyle: { color: '#1677ff' }, connectNulls: true },
                          { name: `${comparePump.model}-效率`, type: 'line', smooth: true, yAxisIndex: 1, data: (() => { const m = new Map(comparePump.performanceCurve.map(p => [p.flow, p.efficiency])); return [...new Set([...selectedPump.performanceCurve.map(p => p.flow), ...comparePump.performanceCurve.map(p => p.flow)])].sort((a, b) => a - b).map(f => m.get(f) ?? null) })(), lineStyle: { color: '#ff4d4f', width: 2, type: 'dashed' }, itemStyle: { color: '#ff4d4f' }, connectNulls: true },
                        ],
                      }}
                    />
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Card>
      )}
    </>
  )

  const renderSelectionTab = () => (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={8}>
        <Card title={<Space><ExperimentOutlined />选型条件输入</Space>} size="small">
          <Form form={form} layout="vertical" onFinish={handleSmartSelection}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="井深 (m)" name="wellDepth" rules={[{ required: true, message: '请输入井深' }]}>
                  <InputNumber style={{ width: '100%' }} min={0} max={5000} placeholder="如 2800" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="目标排量 (m³/d)" name="targetDisplacement" rules={[{ required: true, message: '请输入目标排量' }]}>
                  <InputNumber style={{ width: '100%' }} min={0} max={500} placeholder="如 60" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="目标扬程 (m)" name="targetHead" rules={[{ required: true, message: '请输入目标扬程' }]}>
                  <InputNumber style={{ width: '100%' }} min={0} max={5000} placeholder="如 2200" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="井温 (°C)" name="wellTemp">
                  <InputNumber style={{ width: '100%' }} min={0} max={200} placeholder="如 85" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="含气量 (%)" name="gasContent">
                  <InputNumber style={{ width: '100%' }} min={0} max={100} placeholder="如 20" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="含砂量 (%)" name="sandContent">
                  <InputNumber style={{ width: '100%' }} min={0} max={10} step={0.01} placeholder="如 0.05" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="套管内径 (mm)" name="casingDiameter">
                  <InputNumber style={{ width: '100%' }} min={0} max={500} placeholder="如 140" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="泵型偏好" name="pumpPreference" initialValue="any">
                  <Select options={[{ value: 'any', label: '不限' }, { value: 'ESP', label: 'ESP 电潜泵' }]} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item>
              <Button type="primary" htmlType="submit" icon={<ThunderboltOutlined />} block>智能选型推荐</Button>
            </Form.Item>
          </Form>
        </Card>
      </Col>

      <Col xs={24} lg={16}>
        {selectionResults.length > 0 ? (
          <>
            <Card title="推荐泵型列表（按匹配度排序）" size="small" style={{ marginBottom: 16 }}>
              {selectionResults.map((r, idx) => (
                <Card
                  key={r.pump.id}
                  type="inner"
                  size="small"
                  style={{ marginBottom: idx < selectionResults.length - 1 ? 12 : 0, borderLeft: idx === 0 ? '3px solid #1677ff' : idx === 1 ? '3px solid #52c41a' : '3px solid #d9d9d9' }}
                >
                  <Row gutter={16} align="middle">
                    <Col xs={24} sm={4} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 12, color: '#8c8c8c' }}>匹配度</div>
                      <Progress
                        type="circle"
                        percent={r.score}
                        size={64}
                        strokeColor={r.score >= 80 ? '#52c41a' : r.score >= 60 ? '#faad14' : '#ff4d4f'}
                        format={p => <span style={{ fontSize: 16, fontWeight: 600 }}>{p}%</span>}
                      />
                    </Col>
                    <Col xs={24} sm={10}>
                      <div style={{ fontSize: 15, fontWeight: 600 }}>
                        {idx === 0 && <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />}
                        {r.pump.model}
                        <Tag color={typeColorMap[r.pump.type]} style={{ marginLeft: 8 }}>{r.pump.type}</Tag>
                      </div>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginTop: 4 }}>{r.pump.series} · {r.pump.manufacturer}</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>
                        排量 {r.pump.ratedDisplacement} m³/d · 扬程 {r.pump.ratedHead} m · 功率 {r.pump.ratedPower} kW · 效率 {r.pump.ratedEfficiency}%
                      </div>
                    </Col>
                    <Col xs={24} sm={10}>
                      <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                        <InfoCircleOutlined style={{ marginRight: 4 }} />推荐理由
                      </div>
                      {r.reasons.map((reason, ri) => (
                        <Tag key={ri} style={{ marginBottom: 4 }} color={reason.includes('超过') || reason.includes('偏离') || reason.includes('偏差') || reason.includes('超出') ? 'orange' : 'green'}>
                          {reason}
                        </Tag>
                      ))}
                    </Col>
                  </Row>
                </Card>
              ))}
            </Card>

            {overlayChartOption && (
              <Card title="Top 3 推荐泵型性能曲线对比" size="small">
                <ReactECharts option={overlayChartOption} style={{ height: 380 }} />
              </Card>
            )}
          </>
        ) : (
          <Card style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Empty description="请在左侧输入选型条件后点击「智能选型推荐」" />
          </Card>
        )}
      </Col>
    </Row>
  )

  return (
    <div className="page-container">
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'library',
            label: <span><DatabaseOutlined /> 泵型库浏览</span>,
            children: renderLibraryTab(),
          },
          {
            key: 'selection',
            label: <span><ExperimentOutlined /> 智能选型</span>,
            children: renderSelectionTab(),
          },
        ]}
      />
    </div>
  )
}

export default PumpSelection
