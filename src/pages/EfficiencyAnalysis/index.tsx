import React, { useMemo } from 'react'
import { Row, Col, Card, Table, Tag, Statistic } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  RiseOutlined,
  FallOutlined,
  DashboardOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { wellList, productionHistory } from '../../mock/wellData'

const activeWells = wellList.filter(w => w.status !== 'offline')

const EfficiencyAnalysis: React.FC = () => {
  const avgEfficiency = useMemo(() => Math.round(activeWells.reduce((s, w) => s + w.efficiency, 0) / activeWells.length * 10) / 10, [])
  const maxWell = useMemo(() => activeWells.reduce((a, b) => a.efficiency > b.efficiency ? a : b), [])
  const minWell = useMemo(() => activeWells.reduce((a, b) => a.efficiency < b.efficiency ? a : b), [])
  const passRate = useMemo(() => Math.round(activeWells.filter(w => w.efficiency >= 35).length / activeWells.length * 100), [])

  const rankOption = useMemo(() => {
    const sorted = [...activeWells].sort((a, b) => a.efficiency - b.efficiency)
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { top: 10, right: 40, bottom: 20, left: 100 },
      xAxis: { type: 'value', name: '效率(%)', max: 70 },
      yAxis: { type: 'category', data: sorted.map(w => w.name) },
      series: [{
        type: 'bar', barWidth: 18,
        data: sorted.map(w => ({
          value: w.efficiency,
          itemStyle: { color: w.efficiency >= 45 ? '#52c41a' : w.efficiency >= 35 ? '#faad14' : '#ff4d4f' },
        })),
        label: { show: true, position: 'right', formatter: '{c}%' },
        markLine: {
          data: [{ xAxis: 35, name: '达标线' }],
          label: { formatter: '达标线 35%' },
          lineStyle: { color: '#ff4d4f', type: 'dashed' },
        },
      }],
    }
  }, [])

  const histogramOption = useMemo(() => {
    const bins = [
      { range: '0-20%', min: 0, max: 20 },
      { range: '20-30%', min: 20, max: 30 },
      { range: '30-40%', min: 30, max: 40 },
      { range: '40-50%', min: 40, max: 50 },
      { range: '50-60%', min: 50, max: 60 },
      { range: '60%+', min: 60, max: 100 },
    ]
    const counts = bins.map(b => activeWells.filter(w => w.efficiency >= b.min && w.efficiency < b.max).length)
    return {
      tooltip: { trigger: 'axis' },
      grid: { top: 20, right: 20, bottom: 30, left: 50 },
      xAxis: { type: 'category', data: bins.map(b => b.range) },
      yAxis: { type: 'value', name: '井数', minInterval: 1 },
      series: [{
        type: 'bar', barWidth: 40,
        data: counts.map((c, i) => ({
          value: c,
          itemStyle: { color: i <= 1 ? '#ff4d4f' : i <= 2 ? '#faad14' : '#52c41a' },
        })),
        label: { show: true, position: 'top' },
      }],
    }
  }, [])

  const trendOption = useMemo(() => {
    const dates = [...new Set(productionHistory.map(r => r.date))].slice(-30)
    const wells = activeWells.slice(0, 6)
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: wells.map(w => w.name), bottom: 0 },
      grid: { top: 30, right: 20, bottom: 50, left: 50 },
      xAxis: { type: 'category', data: dates, axisLabel: { rotate: 45, fontSize: 10 } },
      yAxis: { type: 'value', name: '泵效(%)', min: 10, max: 70 },
      series: wells.map(w => ({
        name: w.name,
        type: 'line',
        smooth: true,
        showSymbol: false,
        data: dates.map(d => {
          const rec = productionHistory.find(r => r.date === d && r.wellId === w.id)
          return rec ? rec.pumpEfficiency : null
        }),
      })),
    }
  }, [])

  const freqScatterOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (p: { data: number[]; seriesName: string }) => `${p.seriesName}<br/>频率: ${p.data[0]}Hz, 效率: ${p.data[1]}%` },
    grid: { top: 20, right: 20, bottom: 40, left: 50 },
    xAxis: { type: 'value', name: '频率(Hz)', min: 25, max: 55 },
    yAxis: { type: 'value', name: '效率(%)', min: 10, max: 65 },
    series: activeWells.map(w => ({
      name: w.name,
      type: 'scatter',
      symbolSize: 14,
      data: [[w.frequency, w.efficiency]],
    })),
  }), [])

  const waterScatterOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (p: { data: number[]; seriesName: string }) => `${p.seriesName}<br/>含水率: ${p.data[0]}%, 效率: ${p.data[1]}%` },
    grid: { top: 20, right: 20, bottom: 40, left: 50 },
    xAxis: { type: 'value', name: '含水率(%)', min: 55, max: 90 },
    yAxis: { type: 'value', name: '效率(%)', min: 10, max: 65 },
    series: activeWells.map(w => ({
      name: w.name,
      type: 'scatter',
      symbolSize: 14,
      data: [[w.waterCut, w.efficiency]],
    })),
  }), [])

  const subScatterOption = useMemo(() => ({
    tooltip: { trigger: 'item', formatter: (p: { data: number[]; seriesName: string }) => `${p.seriesName}<br/>沉没度: ${p.data[0]}m, 效率: ${p.data[1]}%` },
    grid: { top: 20, right: 20, bottom: 40, left: 50 },
    xAxis: { type: 'value', name: '沉没度(m)', min: 100, max: 600 },
    yAxis: { type: 'value', name: '效率(%)', min: 10, max: 65 },
    series: activeWells.map(w => ({
      name: w.name,
      type: 'scatter',
      symbolSize: 14,
      data: [[w.submergence, w.efficiency]],
    })),
  }), [])

  const energyOption = useMemo(() => {
    const sorted = [...activeWells].sort((a, b) => {
      const ea = a.dailyLiquid > 0 ? a.power * 24 / a.dailyLiquid : 999
      const eb = b.dailyLiquid > 0 ? b.power * 24 / b.dailyLiquid : 999
      return eb - ea
    })
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      grid: { top: 20, right: 20, bottom: 60, left: 50 },
      xAxis: { type: 'category', data: sorted.map(w => w.name), axisLabel: { rotate: 30 } },
      yAxis: { type: 'value', name: '单位能耗(kWh/t)' },
      series: [{
        type: 'bar', barWidth: 28,
        data: sorted.map(w => {
          const v = w.dailyLiquid > 0 ? Math.round(w.power * 24 / w.dailyLiquid * 10) / 10 : 0
          return { value: v, itemStyle: { color: v <= 10 ? '#52c41a' : v <= 15 ? '#faad14' : '#ff4d4f' } }
        }),
        label: { show: true, position: 'top', fontSize: 10 },
        markLine: {
          data: [{ yAxis: 12, name: '行业标准' }],
          label: { formatter: '行业标准' },
          lineStyle: { color: '#1677ff', type: 'dashed' },
        },
      }],
    }
  }, [])

  const suggestionData = useMemo(() => activeWells.map(w => {
    const powerPerTon = w.dailyLiquid > 0 ? Math.round(w.power * 24 / w.dailyLiquid * 10) / 10 : 0
    let suggestion = '维持当前运行状态'
    let level: 'success' | 'warning' | 'error' = 'success'
    if (w.efficiency < 30) { suggestion = '建议检泵或调整运行参数，效率严重偏低'; level = 'error' }
    else if (w.efficiency < 40) { suggestion = '建议优化频率，提升泵效'; level = 'warning' }
    else if (powerPerTon > 15) { suggestion = '单位能耗偏高，建议降频节能'; level = 'warning' }
    return { key: w.id, name: w.name, efficiency: w.efficiency, powerPerTon, frequency: w.frequency, suggestion, level }
  }), [])

  const suggestionColumns: ColumnsType<typeof suggestionData[0]> = [
    { title: '井号', dataIndex: 'name', width: 120 },
    {
      title: '当前效率(%)', dataIndex: 'efficiency', width: 120, sorter: (a, b) => a.efficiency - b.efficiency,
      render: (v: number) => <span style={{ fontWeight: 600, color: v >= 40 ? '#52c41a' : v >= 30 ? '#faad14' : '#ff4d4f' }}>{v}</span>,
    },
    { title: '单位能耗(kWh/t)', dataIndex: 'powerPerTon', width: 140, sorter: (a, b) => a.powerPerTon - b.powerPerTon },
    { title: '运行频率(Hz)', dataIndex: 'frequency', width: 120 },
    {
      title: '状态', dataIndex: 'level', width: 80, align: 'center',
      render: (l: string) => <Tag color={l === 'success' ? 'green' : l === 'warning' ? 'orange' : 'red'}>{l === 'success' ? '正常' : l === 'warning' ? '待优化' : '异常'}</Tag>,
    },
    { title: '提升建议', dataIndex: 'suggestion', ellipsis: true },
  ]

  return (
    <div className="page-container">
      <Row gutter={[16, 16]}>
        {[
          { title: '平均系统效率', value: avgEfficiency, suffix: '%', icon: <DashboardOutlined />, color: '#1677ff' },
          { title: '最高效率井', value: maxWell.efficiency, suffix: `% (${maxWell.name})`, icon: <RiseOutlined />, color: '#52c41a' },
          { title: '最低效率井', value: minWell.efficiency, suffix: `% (${minWell.name})`, icon: <FallOutlined />, color: '#ff4d4f' },
          { title: '效率达标率', value: passRate, suffix: '%', icon: <CheckCircleOutlined />, color: '#722ed1' },
        ].map(item => (
          <Col xs={12} sm={12} md={6} key={item.title}>
            <Card className="stat-card" hoverable>
              <Statistic title={item.title} value={item.value} suffix={item.suffix} prefix={item.icon} valueStyle={{ color: item.color, fontWeight: 600 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={14}>
          <Card title="效率排名" className="chart-card">
            <ReactECharts option={rankOption} style={{ height: 400 }} />
          </Card>
        </Col>
        <Col xs={24} md={10}>
          <Card title="效率分布直方图" className="chart-card">
            <ReactECharts option={histogramOption} style={{ height: 400 }} />
          </Card>
        </Col>
      </Row>

      <Card title="效率趋势图（近30天）" className="chart-card" style={{ marginTop: 16 }}>
        <ReactECharts option={trendOption} style={{ height: 380 }} />
      </Card>

      <Card title="效率影响因素分析" className="chart-card" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={8}>
            <Card type="inner" title="频率 vs 效率" size="small">
              <ReactECharts option={freqScatterOption} style={{ height: 280 }} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card type="inner" title="含水率 vs 效率" size="small">
              <ReactECharts option={waterScatterOption} style={{ height: 280 }} />
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card type="inner" title="沉没度 vs 效率" size="small">
              <ReactECharts option={subScatterOption} style={{ height: 280 }} />
            </Card>
          </Col>
        </Row>
      </Card>

      <Card title="效率提升建议" className="chart-card" style={{ marginTop: 16 }}>
        <Table
          columns={suggestionColumns}
          dataSource={suggestionData}
          rowKey="key"
          size="middle"
          pagination={false}
        />
      </Card>

      <Card title="能耗分析 — 各井单位产液能耗对比" className="chart-card" style={{ marginTop: 16 }}>
        <ReactECharts option={energyOption} style={{ height: 380 }} />
      </Card>
    </div>
  )
}

export default EfficiencyAnalysis
