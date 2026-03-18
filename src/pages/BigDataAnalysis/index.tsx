import React, { useMemo } from 'react'
import { Row, Col, Card, Statistic, Table, Tag, Typography, Space, Progress } from 'antd'
import {
  DatabaseOutlined,
  BarChartOutlined,
  AlertOutlined,
  BulbOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { wellList, productionHistory } from '../../mock/wellData'
import type { ProductionRecord } from '../../mock/wellData'

const { Title, Text } = Typography

const BigDataAnalysis: React.FC = () => {
  const activeWells = wellList.filter(w => w.status !== 'offline')
  const anomalyWells = wellList.filter(w => w.status === 'alarm' || w.status === 'warning')

  const oilFieldProduction = useMemo(() => {
    const map = new Map<string, { liquid: number; oil: number; water: number }>()
    activeWells.forEach(w => {
      const prev = map.get(w.oilField) || { liquid: 0, oil: 0, water: 0 }
      map.set(w.oilField, {
        liquid: prev.liquid + w.dailyLiquid,
        oil: prev.oil + w.dailyOil,
        water: prev.water + (w.dailyLiquid - w.dailyOil),
      })
    })
    return Array.from(map.entries()).map(([name, data]) => ({ name, ...data }))
  }, [])

  const oilFieldChartOption = {
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['日产液(t)', '日产油(t)', '日产水(t)'] },
    grid: { left: 60, right: 20, bottom: 40, top: 40 },
    xAxis: { type: 'category' as const, data: oilFieldProduction.map(d => d.name) },
    yAxis: { type: 'value' as const, name: '产量(t/d)' },
    series: [
      { name: '日产液(t)', type: 'bar', data: oilFieldProduction.map(d => Math.round(d.liquid * 10) / 10), itemStyle: { color: '#1677ff' } },
      { name: '日产油(t)', type: 'bar', data: oilFieldProduction.map(d => Math.round(d.oil * 10) / 10), itemStyle: { color: '#52c41a' } },
      { name: '日产水(t)', type: 'bar', data: oilFieldProduction.map(d => Math.round(d.water * 10) / 10), itemStyle: { color: '#faad14' } },
    ],
  }

  const efficiencyHistogram = useMemo(() => {
    const bins = [0, 20, 25, 30, 35, 40, 45, 50, 55, 60]
    const counts = bins.map((_, i) => {
      const lo = bins[i]
      const hi = i < bins.length - 1 ? bins[i + 1] : 100
      return activeWells.filter(w => w.efficiency >= lo && w.efficiency < hi).length
    })
    return {
      tooltip: { trigger: 'axis' as const },
      grid: { left: 50, right: 20, bottom: 40, top: 30 },
      xAxis: {
        type: 'category' as const,
        data: bins.map((b, i) => i < bins.length - 1 ? `${b}-${bins[i + 1]}%` : `${b}%+`),
        axisLabel: { rotate: 30 },
      },
      yAxis: { type: 'value' as const, name: '井数', minInterval: 1 },
      series: [{
        type: 'bar',
        data: counts,
        itemStyle: {
          color: (params: { dataIndex: number }) => {
            const colors = ['#ff4d4f', '#ff7a45', '#ffa940', '#ffc53d', '#fadb14', '#a0d911', '#52c41a', '#13c2c2', '#1677ff', '#722ed1']
            return colors[params.dataIndex % colors.length]
          },
        },
      }],
    }
  }, [])

  const scatterOption = {
    tooltip: {
      trigger: 'item' as const,
      formatter: (p: { data: number[]; name: string }) => `${p.data[2]}<br/>含水率: ${p.data[0]}%<br/>泵效: ${p.data[1]}%`,
    },
    grid: { left: 60, right: 20, bottom: 50, top: 30 },
    xAxis: { type: 'value' as const, name: '含水率(%)', min: 50, max: 100 },
    yAxis: { type: 'value' as const, name: '泵效(%)', min: 0, max: 70 },
    series: [{
      type: 'scatter',
      symbolSize: 14,
      data: activeWells.map(w => [w.waterCut, w.efficiency, w.name]),
      itemStyle: {
        color: (p: { data: number[] }) => p.data[1] < 30 ? '#ff4d4f' : p.data[1] < 40 ? '#faad14' : '#52c41a',
      },
    }],
  }

  const boxplotData = useMemo(() => {
    const params: { name: string; key: keyof typeof activeWells[0] }[] = [
      { name: '泵效(%)', key: 'efficiency' },
      { name: '含水率(%)', key: 'waterCut' },
      { name: '日产液(t)', key: 'dailyLiquid' },
      { name: '温度(°C)', key: 'temperature' },
      { name: '振动(mm/s)', key: 'vibration' },
    ]
    const categories = params.map(p => p.name)
    const boxData = params.map(p => {
      const values = activeWells.map(w => Number(w[p.key])).sort((a, b) => a - b)
      const q1 = values[Math.floor(values.length * 0.25)]
      const median = values[Math.floor(values.length * 0.5)]
      const q3 = values[Math.floor(values.length * 0.75)]
      const min = values[0]
      const max = values[values.length - 1]
      return [min, q1, median, q3, max]
    })
    return {
      tooltip: { trigger: 'item' as const },
      grid: { left: 60, right: 20, bottom: 40, top: 30 },
      xAxis: { type: 'category' as const, data: categories },
      yAxis: { type: 'value' as const },
      series: [{
        type: 'boxplot',
        data: boxData,
        itemStyle: { color: '#1677ff', borderColor: '#1677ff' },
      }],
    }
  }, [])

  const trendData = useMemo(() => {
    const dailyTotals = new Map<string, { liquid: number; oil: number }>()
    productionHistory.forEach((r: ProductionRecord) => {
      const prev = dailyTotals.get(r.date) || { liquid: 0, oil: 0 }
      dailyTotals.set(r.date, { liquid: prev.liquid + r.liquidVolume, oil: prev.oil + r.oilVolume })
    })
    const sorted = Array.from(dailyTotals.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    const dates = sorted.map(d => d[0].slice(5))
    const liquids = sorted.map(d => Math.round(d[1].liquid * 10) / 10)
    const oils = sorted.map(d => Math.round(d[1].oil * 10) / 10)

    const predictDays = 7
    const lastLiquid = liquids.slice(-5)
    const lastOil = oils.slice(-5)
    const avgLiquidTrend = (lastLiquid[lastLiquid.length - 1] - lastLiquid[0]) / lastLiquid.length
    const avgOilTrend = (lastOil[lastOil.length - 1] - lastOil[0]) / lastOil.length

    const predDates: string[] = []
    const predLiquids: (number | null)[] = new Array(dates.length).fill(null)
    const predOils: (number | null)[] = new Array(dates.length).fill(null)
    predLiquids[dates.length - 1] = liquids[liquids.length - 1]
    predOils[dates.length - 1] = oils[oils.length - 1]

    for (let i = 1; i <= predictDays; i++) {
      const d = new Date()
      d.setDate(d.getDate() + i)
      predDates.push(`${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)
      predLiquids.push(Math.round((liquids[liquids.length - 1] + avgLiquidTrend * i) * 10) / 10)
      predOils.push(Math.round((oils[oils.length - 1] + avgOilTrend * i) * 10) / 10)
    }

    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['日产液(实际)', '日产油(实际)', '日产液(预测)', '日产油(预测)'] },
      grid: { left: 60, right: 20, bottom: 40, top: 40 },
      xAxis: { type: 'category' as const, data: [...dates, ...predDates], axisLabel: { rotate: 45 } },
      yAxis: { type: 'value' as const, name: '产量(t/d)' },
      series: [
        { name: '日产液(实际)', type: 'line', data: [...liquids, ...new Array(predictDays).fill(null)], smooth: true, itemStyle: { color: '#1677ff' } },
        { name: '日产油(实际)', type: 'line', data: [...oils, ...new Array(predictDays).fill(null)], smooth: true, itemStyle: { color: '#52c41a' } },
        { name: '日产液(预测)', type: 'line', data: predLiquids, smooth: true, lineStyle: { type: 'dashed' }, itemStyle: { color: '#1677ff' } },
        { name: '日产油(预测)', type: 'line', data: predOils, smooth: true, lineStyle: { type: 'dashed' }, itemStyle: { color: '#52c41a' } },
      ],
    }
  }, [])

  const anomalyColumns = [
    { title: '井号', dataIndex: 'name', key: 'name', width: 120 },
    { title: '油田', dataIndex: 'oilField', key: 'oilField', width: 100 },
    {
      title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (s: string) => (
        <Tag color={s === 'alarm' ? 'red' : s === 'warning' ? 'orange' : 'green'}>
          {s === 'alarm' ? '报警' : s === 'warning' ? '预警' : '正常'}
        </Tag>
      ),
    },
    { title: '泵效(%)', dataIndex: 'efficiency', key: 'efficiency', width: 90, sorter: (a: typeof wellList[0], b: typeof wellList[0]) => a.efficiency - b.efficiency },
    { title: '温度(°C)', dataIndex: 'temperature', key: 'temperature', width: 90 },
    { title: '振动(mm/s)', dataIndex: 'vibration', key: 'vibration', width: 100 },
    { title: '电流(A)', dataIndex: 'current', key: 'current', width: 90 },
    {
      title: '异常原因', key: 'reason', width: 200,
      render: (_: unknown, r: typeof wellList[0]) => {
        const reasons: string[] = []
        if (r.efficiency < 30) reasons.push('泵效过低')
        if (r.temperature > 90) reasons.push('温度偏高')
        if (r.vibration > 4) reasons.push('振动异常')
        if (r.current > 35) reasons.push('电流过大')
        return reasons.map(t => <Tag key={t} color="red" style={{ marginBottom: 2 }}>{t}</Tag>)
      },
    },
  ]

  const avgEfficiency = Math.round(activeWells.reduce((s, w) => s + w.efficiency, 0) / activeWells.length * 10) / 10
  const totalLiquid = Math.round(activeWells.reduce((s, w) => s + w.dailyLiquid, 0) * 10) / 10
  const totalOil = Math.round(activeWells.reduce((s, w) => s + w.dailyOil, 0) * 10) / 10
  const avgWaterCut = Math.round(activeWells.reduce((s, w) => s + w.waterCut, 0) / activeWells.length * 10) / 10

  return (
    <div className="page-container">
      <Title level={4} style={{ marginBottom: 20 }}>大数据分析总览</Title>

      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card className="stat-card" hoverable>
            <Statistic title="数据总量" value={productionHistory.length} prefix={<DatabaseOutlined style={{ color: '#1677ff' }} />} suffix="条" />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card" hoverable>
            <Statistic title="分析井数" value={activeWells.length} prefix={<BarChartOutlined style={{ color: '#52c41a' }} />} suffix="口" />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card" hoverable>
            <Statistic title="异常检测" value={anomalyWells.length} prefix={<AlertOutlined style={{ color: '#ff4d4f' }} />} suffix="口" valueStyle={{ color: anomalyWells.length > 0 ? '#ff4d4f' : '#52c41a' }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card className="stat-card" hoverable>
            <Statistic title="优化建议" value={anomalyWells.length + 2} prefix={<BulbOutlined style={{ color: '#faad14' }} />} suffix="条" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card className="chart-card" title="各油田产量对比">
            <ReactECharts option={oilFieldChartOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="chart-card" title="泵效分布直方图">
            <ReactECharts option={efficiencyHistogram} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card className="chart-card" title="含水率 vs 泵效散点图">
            <ReactECharts option={scatterOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card className="chart-card" title="关键参数箱线图">
            <ReactECharts option={boxplotData} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      <Card className="chart-card" title="产量趋势预测" style={{ marginTop: 16 }}>
        <ReactECharts option={trendData} style={{ height: 360 }} />
      </Card>

      <Card title="异常检测结果" style={{ marginTop: 16 }}>
        <Table
          columns={anomalyColumns}
          dataSource={anomalyWells}
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 860 }}
        />
      </Card>

      <Card title="关键指标 KPI" style={{ marginTop: 16 }}>
        <Row gutter={[24, 16]}>
          <Col xs={12} md={6}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">平均泵效</Text>
              <div style={{ margin: '8px 0' }}>
                <Progress
                  type="dashboard"
                  percent={avgEfficiency}
                  size={120}
                  strokeColor={avgEfficiency < 35 ? '#ff4d4f' : avgEfficiency < 45 ? '#faad14' : '#52c41a'}
                  format={p => <span style={{ fontSize: 18, fontWeight: 600 }}>{p}%</span>}
                />
              </div>
              <Space>
                <ArrowUpOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                <Text style={{ fontSize: 12, color: '#52c41a' }}>+2.3%</Text>
              </Space>
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">日产液总量</Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#1677ff', margin: '16px 0' }}>{totalLiquid} t</div>
              <Space>
                <ArrowUpOutlined style={{ color: '#52c41a', fontSize: 12 }} />
                <Text style={{ fontSize: 12, color: '#52c41a' }}>+5.1t</Text>
              </Space>
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">日产油总量</Text>
              <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a', margin: '16px 0' }}>{totalOil} t</div>
              <Space>
                <ArrowDownOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
                <Text style={{ fontSize: 12, color: '#ff4d4f' }}>-1.2t</Text>
              </Space>
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div style={{ textAlign: 'center' }}>
              <Text type="secondary">平均含水率</Text>
              <div style={{ margin: '8px 0' }}>
                <Progress
                  type="dashboard"
                  percent={avgWaterCut}
                  size={120}
                  strokeColor={avgWaterCut > 80 ? '#ff4d4f' : avgWaterCut > 70 ? '#faad14' : '#52c41a'}
                  format={p => <span style={{ fontSize: 18, fontWeight: 600 }}>{p}%</span>}
                />
              </div>
              <Space>
                <ArrowUpOutlined style={{ color: '#ff4d4f', fontSize: 12 }} />
                <Text style={{ fontSize: 12, color: '#ff4d4f' }}>+0.8%</Text>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default BigDataAnalysis
