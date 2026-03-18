import React, { useState, useMemo } from 'react'
import { Row, Col, Card, Table, Tag, Statistic, Select, Space, DatePicker } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  CheckCircleOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  DollarOutlined,
  FundOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { optimizationSchemes, wellList, type OptimizationScheme } from '../../mock/wellData'

const { RangePicker } = DatePicker

const ratingConfig: Record<string, { color: string; label: string }> = {
  excellent: { color: 'green', label: '优秀' },
  good: { color: 'blue', label: '良好' },
  average: { color: 'orange', label: '一般' },
  below: { color: 'red', label: '未达标' },
}

const seededRandom = (seed: number) => {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const getActualFactor = (schemeId: string, metricIdx: number) => {
  const seed = schemeId.charCodeAt(schemeId.length - 1) * 100 + metricIdx * 17
  return 0.85 + seededRandom(seed) * 0.25
}

const getRating = (avgAchievement: number): string => {
  if (avgAchievement >= 95) return 'excellent'
  if (avgAchievement >= 80) return 'good'
  if (avgAchievement >= 60) return 'average'
  return 'below'
}

const OptimizationEffect: React.FC = () => {
  const [wellFilter, setWellFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')

  const activeSchemes = useMemo(() => {
    return optimizationSchemes.filter(s => s.status === 'completed' || s.status === 'executing')
  }, [])

  const types = useMemo(() => [...new Set(optimizationSchemes.map(s => s.type))], [])

  const filteredSchemes = useMemo(() => {
    return activeSchemes.filter(s => {
      if (wellFilter !== 'all' && s.wellId !== wellFilter) return false
      if (typeFilter !== 'all' && s.type !== typeFilter) return false
      return true
    })
  }, [activeSchemes, wellFilter, typeFilter])

  const schemeDetails = useMemo(() => {
    return filteredSchemes.map(scheme => {
      const results = scheme.expectedResults.map((r, idx) => {
        const factor = getActualFactor(scheme.id, idx)
        const expectedChange = r.after - r.before
        const actualChange = expectedChange * factor
        const actualValue = r.before + actualChange
        const expectedImprovement = Math.abs(expectedChange / r.before) * 100
        const actualImprovement = Math.abs(actualChange / r.before) * 100
        const achievement = expectedImprovement > 0 ? (actualImprovement / expectedImprovement) * 100 : 100
        return {
          ...r,
          actualValue: Math.round(actualValue * 10) / 10,
          actualImprovement: `${actualChange >= 0 ? '+' : ''}${actualImprovement.toFixed(1)}%`,
          achievement: Math.round(achievement),
        }
      })
      const avgAchievement = results.reduce((s, r) => s + r.achievement, 0) / results.length
      return { ...scheme, results, avgAchievement, rating: getRating(avgAchievement) }
    })
  }, [filteredSchemes])

  const overallStats = useMemo(() => {
    const completed = schemeDetails.filter(s => s.status === 'completed').length
    let totalEnergySaving = 0
    let totalProductionIncrease = 0
    let totalBenefit = 0
    let totalCost = 0

    schemeDetails.forEach(s => {
      totalBenefit += s.benefitEstimate * (s.avgAchievement / 100)
      totalCost += s.costEstimate
      s.results.forEach(r => {
        if (r.metric.includes('耗电')) {
          totalEnergySaving += Math.abs(r.actualValue - r.before) * 365 / 10000
        }
        if (r.metric.includes('产液') || r.metric.includes('产油')) {
          const change = r.actualValue - r.before
          if (change > 0) totalProductionIncrease += change * 365
        }
      })
    })

    const avgROI = totalCost > 0 ? totalBenefit / totalCost : 0
    return {
      completed,
      energySaving: Math.round(totalEnergySaving * 10) / 10,
      productionIncrease: Math.round(totalProductionIncrease),
      totalBenefit: Math.round(totalBenefit / 10000 * 10) / 10,
      avgROI: Math.round(avgROI * 10) / 10,
    }
  }, [schemeDetails])

  const comparisonChartOption = useMemo(() => {
    const names = schemeDetails.map(s => `${s.id}\n${s.wellName}`)
    const expectedData: number[] = []
    const actualData: number[] = []

    schemeDetails.forEach(s => {
      const mainResult = s.results[0]
      if (mainResult) {
        const expectedPct = Math.abs((mainResult.after - mainResult.before) / mainResult.before * 100)
        const actualPct = Math.abs((mainResult.actualValue - mainResult.before) / mainResult.before * 100)
        expectedData.push(Math.round(expectedPct * 10) / 10)
        actualData.push(Math.round(actualPct * 10) / 10)
      }
    })

    return {
      title: { text: '各方案主要指标预期 vs 实际效果', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' as const },
      legend: { bottom: 0, data: ['预期改善(%)', '实际改善(%)'] },
      grid: { top: 50, bottom: 60, left: 60, right: 20 },
      xAxis: { type: 'category' as const, data: names, axisLabel: { fontSize: 11, interval: 0 } },
      yAxis: { type: 'value' as const, name: '改善幅度(%)', nameTextStyle: { fontSize: 11 } },
      series: [
        { name: '预期改善(%)', type: 'bar' as const, data: expectedData, barWidth: 30, itemStyle: { color: '#1677ff', borderRadius: [4, 4, 0, 0] } },
        { name: '实际改善(%)', type: 'bar' as const, data: actualData, barWidth: 30, itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] } },
      ],
    }
  }, [schemeDetails])

  const trendChartOption = useMemo(() => {
    const days = 30
    const dates: string[] = []
    for (let i = days; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(`${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)
    }

    const efficiencyData = dates.map((_, i) => {
      const base = 38 + (i / days) * 8
      return Math.round((base + (seededRandom(i * 7) - 0.5) * 3) * 10) / 10
    })
    const productionData = dates.map((_, i) => {
      const base = 42 + (i / days) * 12
      return Math.round((base + (seededRandom(i * 13) - 0.5) * 4) * 10) / 10
    })
    const energyData = dates.map((_, i) => {
      const base = 580 - (i / days) * 80
      return Math.round((base + (seededRandom(i * 19) - 0.5) * 20) * 10) / 10
    })

    const optimizationDay = Math.floor(days * 0.3)

    return {
      title: { text: '优化实施后关键指标变化趋势', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' as const },
      legend: { bottom: 0, data: ['泵效(%)', '日产液(t)', '日耗电(kWh)'] },
      grid: { top: 50, bottom: 60, left: 60, right: 60 },
      xAxis: { type: 'category' as const, data: dates, axisLabel: { fontSize: 10 } },
      yAxis: [
        { type: 'value' as const, name: '泵效(%) / 产液(t)', nameTextStyle: { fontSize: 11 }, position: 'left' as const },
        { type: 'value' as const, name: '耗电(kWh)', nameTextStyle: { fontSize: 11 }, position: 'right' as const },
      ],
      series: [
        {
          name: '泵效(%)', type: 'line' as const, data: efficiencyData, smooth: true,
          itemStyle: { color: '#1677ff' }, lineStyle: { width: 2 },
          markLine: {
            silent: true,
            data: [{ xAxis: optimizationDay, label: { formatter: '优化实施', fontSize: 11 }, lineStyle: { color: '#ff4d4f', type: 'dashed' as const } }],
          },
        },
        {
          name: '日产液(t)', type: 'line' as const, data: productionData, smooth: true,
          itemStyle: { color: '#52c41a' }, lineStyle: { width: 2 },
        },
        {
          name: '日耗电(kWh)', type: 'line' as const, data: energyData, smooth: true, yAxisIndex: 1,
          itemStyle: { color: '#fa8c16' }, lineStyle: { width: 2 },
        },
      ],
    }
  }, [])

  const productionCompareChartOption = useMemo(() => {
    const days = 60
    const dates: string[] = []
    for (let i = days; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      dates.push(`${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`)
    }

    const optimizeStartDay = 20

    const baseActualLiquid = 42
    const baseActualOil = 14
    const predictedLiquidTarget = 55
    const predictedOilTarget = 20

    const actualLiquidData = dates.map((_, i) => {
      if (i < optimizeStartDay) {
        return Math.round((baseActualLiquid + (seededRandom(i * 11) - 0.5) * 6) * 10) / 10
      }
      const progress = (i - optimizeStartDay) / (days - optimizeStartDay)
      const rampUp = 1 - Math.exp(-3 * progress)
      const target = baseActualLiquid + (predictedLiquidTarget - baseActualLiquid) * rampUp * 0.92
      return Math.round((target + (seededRandom(i * 11) - 0.5) * 4) * 10) / 10
    })

    const actualOilData = dates.map((_, i) => {
      if (i < optimizeStartDay) {
        return Math.round((baseActualOil + (seededRandom(i * 23) - 0.5) * 3) * 10) / 10
      }
      const progress = (i - optimizeStartDay) / (days - optimizeStartDay)
      const rampUp = 1 - Math.exp(-3 * progress)
      const target = baseActualOil + (predictedOilTarget - baseActualOil) * rampUp * 0.88
      return Math.round((target + (seededRandom(i * 23) - 0.5) * 2) * 10) / 10
    })

    const predictedLiquidData = dates.map((_, i) => {
      if (i < optimizeStartDay) return null
      const progress = (i - optimizeStartDay) / (days - optimizeStartDay)
      const rampUp = 1 - Math.exp(-2.5 * progress)
      return Math.round((baseActualLiquid + (predictedLiquidTarget - baseActualLiquid) * rampUp) * 10) / 10
    })

    const predictedOilData = dates.map((_, i) => {
      if (i < optimizeStartDay) return null
      const progress = (i - optimizeStartDay) / (days - optimizeStartDay)
      const rampUp = 1 - Math.exp(-2.5 * progress)
      return Math.round((baseActualOil + (predictedOilTarget - baseActualOil) * rampUp) * 10) / 10
    })

    return {
      title: { text: '优化后实际生产 vs 预测产量对比', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: { type: 'cross' as const },
      },
      legend: {
        bottom: 0,
        data: ['实际日产液(t)', '预测日产液(t)', '实际日产油(t)', '预测日产油(t)'],
      },
      grid: { top: 50, bottom: 70, left: 60, right: 60 },
      xAxis: {
        type: 'category' as const,
        data: dates,
        axisLabel: { fontSize: 10, rotate: 30 },
        boundaryGap: false,
      },
      yAxis: [
        { type: 'value' as const, name: '日产液(t)', nameTextStyle: { fontSize: 11 }, position: 'left' as const },
        { type: 'value' as const, name: '日产油(t)', nameTextStyle: { fontSize: 11 }, position: 'right' as const },
      ],
      series: [
        {
          name: '实际日产液(t)', type: 'line' as const, data: actualLiquidData, smooth: true,
          itemStyle: { color: '#1677ff' }, lineStyle: { width: 2 },
          symbol: 'circle', symbolSize: 3,
          markLine: {
            silent: true,
            data: [{
              xAxis: optimizeStartDay,
              label: { formatter: '优化实施', fontSize: 11, position: 'insideStartTop' as const },
              lineStyle: { color: '#ff4d4f', type: 'dashed' as const, width: 2 },
            }],
          },
        },
        {
          name: '预测日产液(t)', type: 'line' as const, data: predictedLiquidData, smooth: true,
          itemStyle: { color: '#1677ff' }, lineStyle: { width: 2, type: 'dashed' as const },
          symbol: 'diamond', symbolSize: 4,
        },
        {
          name: '实际日产油(t)', type: 'line' as const, data: actualOilData, smooth: true, yAxisIndex: 1,
          itemStyle: { color: '#52c41a' }, lineStyle: { width: 2 },
          symbol: 'circle', symbolSize: 3,
        },
        {
          name: '预测日产油(t)', type: 'line' as const, data: predictedOilData, smooth: true, yAxisIndex: 1,
          itemStyle: { color: '#52c41a' }, lineStyle: { width: 2, type: 'dashed' as const },
          symbol: 'diamond', symbolSize: 4,
        },
      ],
    }
  }, [])

  const economicChartOption = useMemo(() => {
    const names = schemeDetails.map(s => `${s.id}`)
    const costData = schemeDetails.map(s => Math.round(s.costEstimate / 10000 * 100) / 100)
    const benefitData = schemeDetails.map(s => Math.round(s.benefitEstimate * (s.avgAchievement / 100) / 10000 * 100) / 100)

    const cumulativeBenefit: number[] = []
    let cumSum = 0
    benefitData.forEach(b => {
      cumSum += b
      cumulativeBenefit.push(Math.round(cumSum * 100) / 100)
    })

    return {
      title: { text: '经济效益分析', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' as const },
      legend: { bottom: 0, data: ['成本(万元)', '实际收益(万元)', '累计收益(万元)'] },
      grid: { top: 50, bottom: 60, left: 60, right: 60 },
      xAxis: { type: 'category' as const, data: names, axisLabel: { fontSize: 11 } },
      yAxis: [
        { type: 'value' as const, name: '金额(万元)', nameTextStyle: { fontSize: 11 }, position: 'left' as const },
        { type: 'value' as const, name: '累计(万元)', nameTextStyle: { fontSize: 11 }, position: 'right' as const },
      ],
      series: [
        {
          name: '成本(万元)', type: 'bar' as const, data: costData, barWidth: 25,
          itemStyle: { color: '#ff4d4f', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '实际收益(万元)', type: 'bar' as const, data: benefitData, barWidth: 25,
          itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '累计收益(万元)', type: 'line' as const, data: cumulativeBenefit, yAxisIndex: 1,
          smooth: true, itemStyle: { color: '#1677ff' }, lineStyle: { width: 2, type: 'dashed' as const },
          areaStyle: { color: 'rgba(22,119,255,0.08)' },
        },
      ],
    }
  }, [schemeDetails])

  const detailColumns: ColumnsType<(typeof schemeDetails)[0]> = [
    {
      title: '方案ID', dataIndex: 'id', width: 100,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontWeight: 500 }}>{v}</span>,
    },
    { title: '井名', dataIndex: 'wellName', width: 110 },
    {
      title: '类型', dataIndex: 'type', width: 90,
      render: (v: string) => <Tag color="cyan">{v}</Tag>,
    },
    {
      title: '状态', dataIndex: 'status', width: 90, align: 'center',
      render: (s: string) => (
        <Tag color={s === 'completed' ? 'green' : 'orange'}>
          {s === 'completed' ? '已完成' : '执行中'}
        </Tag>
      ),
    },
    {
      title: '主要指标', width: 100,
      render: (_: unknown, r: (typeof schemeDetails)[0]) => r.results[0]?.metric || '-',
    },
    {
      title: '预期改善', width: 100, align: 'center',
      render: (_: unknown, r: (typeof schemeDetails)[0]) => {
        const res = r.results[0]
        if (!res) return '-'
        return <span style={{ color: '#1677ff' }}>{res.improvement}</span>
      },
    },
    {
      title: '实际改善', width: 100, align: 'center',
      render: (_: unknown, r: (typeof schemeDetails)[0]) => {
        const res = r.results[0]
        if (!res) return '-'
        return <span style={{ color: '#52c41a', fontWeight: 500 }}>{res.actualImprovement}</span>
      },
    },
    {
      title: '达标率', width: 90, align: 'center',
      sorter: (a, b) => a.avgAchievement - b.avgAchievement,
      render: (_: unknown, r: (typeof schemeDetails)[0]) => {
        const pct = Math.round(r.avgAchievement)
        let color = '#52c41a'
        if (pct < 60) color = '#ff4d4f'
        else if (pct < 80) color = '#fa8c16'
        else if (pct < 95) color = '#1677ff'
        return <span style={{ color, fontWeight: 600 }}>{pct}%</span>
      },
    },
    {
      title: '效果评级', width: 100, align: 'center',
      sorter: (a, b) => a.avgAchievement - b.avgAchievement,
      render: (_: unknown, r: (typeof schemeDetails)[0]) => {
        const cfg = ratingConfig[r.rating]
        return cfg ? <Tag color={cfg.color} icon={r.rating === 'excellent' ? <TrophyOutlined /> : undefined}>{cfg.label}</Tag> : '-'
      },
    },
  ]

  const expandedRowRender = (record: (typeof schemeDetails)[0]) => (
    <Table
      size="small"
      pagination={false}
      dataSource={record.results.map((r, i) => ({ ...r, key: i }))}
      columns={[
        { title: '指标', dataIndex: 'metric', width: 120 },
        { title: '优化前', dataIndex: 'before', width: 100, align: 'center' as const, render: (v: number, r: { unit: string }) => `${v} ${r.unit}` },
        { title: '预期值', dataIndex: 'after', width: 100, align: 'center' as const, render: (v: number, r: { unit: string }) => <span style={{ color: '#1677ff' }}>{v} {r.unit}</span> },
        { title: '实际值', dataIndex: 'actualValue', width: 100, align: 'center' as const, render: (v: number, r: { unit: string }) => <span style={{ color: '#52c41a', fontWeight: 600 }}>{v} {r.unit}</span> },
        { title: '预期改善', dataIndex: 'improvement', width: 100, align: 'center' as const },
        { title: '实际改善', dataIndex: 'actualImprovement', width: 100, align: 'center' as const, render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
        {
          title: '达标率', dataIndex: 'achievement', width: 100, align: 'center' as const,
          render: (v: number) => {
            let color = '#52c41a'
            if (v < 60) color = '#ff4d4f'
            else if (v < 80) color = '#fa8c16'
            else if (v < 95) color = '#1677ff'
            return <span style={{ color, fontWeight: 600 }}>{v}%</span>
          },
        },
      ]}
    />
  )

  return (
    <div className="page-container" style={{ padding: 20, background: '#f0f2f5', minHeight: '100%' }}>
      {/* 顶部筛选 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={12}>
          <Select value={wellFilter} onChange={setWellFilter} style={{ width: 160 }}
            options={[
              { value: 'all', label: '全部井' },
              ...wellList.map(w => ({ value: w.id, label: w.name })),
            ]}
          />
          <Select value={typeFilter} onChange={setTypeFilter} style={{ width: 140 }}
            options={[{ value: 'all', label: '全部类型' }, ...types.map(t => ({ value: t, label: t }))]}
          />
          <RangePicker style={{ width: 260 }} />
        </Space>
      </Card>

      {/* 总体效果统计 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={5}>
          <Card size="small" hoverable>
            <Statistic title="已完成方案数" value={overallStats.completed}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable>
            <Statistic title="累计节能量" value={overallStats.energySaving} suffix="万kWh"
              prefix={<ThunderboltOutlined style={{ color: '#fa8c16' }} />} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable>
            <Statistic title="累计增产量" value={overallStats.productionIncrease} suffix="t"
              prefix={<RiseOutlined style={{ color: '#1677ff' }} />} valueStyle={{ color: '#1677ff' }} />
          </Card>
        </Col>
        <Col span={5}>
          <Card size="small" hoverable>
            <Statistic title="累计经济效益" value={overallStats.totalBenefit} suffix="万元"
              prefix={<DollarOutlined style={{ color: '#eb2f96' }} />} valueStyle={{ color: '#eb2f96' }} />
          </Card>
        </Col>
        <Col span={4}>
          <Card size="small" hoverable>
            <Statistic title="平均投入产出比" value={`1:${overallStats.avgROI}`}
              prefix={<FundOutlined style={{ color: '#722ed1' }} />} valueStyle={{ color: '#722ed1', fontSize: 22 }} />
          </Card>
        </Col>
      </Row>

      {/* 效果对比图 + 趋势图 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <Card size="small">
            <ReactECharts option={comparisonChartOption} style={{ height: 340 }} />
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small">
            <ReactECharts option={trendChartOption} style={{ height: 340 }} />
          </Card>
        </Col>
      </Row>

      {/* 实际生产 vs 预测产量对比 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <ReactECharts option={productionCompareChartOption} style={{ height: 400 }} />
      </Card>

      {/* 方案效果明细 */}
      <Card title={<Space><FundOutlined />方案效果明细</Space>} size="small" style={{ marginBottom: 16 }}>
        <Table
          columns={detailColumns}
          dataSource={schemeDetails}
          rowKey="id"
          size="small"
          pagination={false}
          expandable={{ expandedRowRender }}
        />
      </Card>

      {/* 经济效益分析 */}
      <Card size="small">
        <ReactECharts option={economicChartOption} style={{ height: 360 }} />
      </Card>
    </div>
  )
}

export default OptimizationEffect
