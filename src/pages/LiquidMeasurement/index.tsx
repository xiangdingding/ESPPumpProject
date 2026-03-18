import React, { useState, useMemo } from 'react'
import {
  Card,
  Select,
  Row,
  Col,
  Statistic,
  Table,
  Button,
  DatePicker,
  Space,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ExperimentOutlined,
  DownloadOutlined,
  BarChartOutlined,
  RiseOutlined,
  FallOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { wellList, productionHistory } from '../../mock/wellData'
import type { ProductionRecord } from '../../mock/wellData'

const { RangePicker } = DatePicker

const oilFields = [...new Set(wellList.map((w) => w.oilField))]

const LiquidMeasurement: React.FC = () => {
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'day'),
    dayjs(),
  ])
  const [selectedOilField, setSelectedOilField] = useState<string | undefined>(undefined)
  const [selectedWellId, setSelectedWellId] = useState<string | undefined>(undefined)

  const filteredWells = useMemo(() => {
    if (!selectedOilField) return wellList
    return wellList.filter((w) => w.oilField === selectedOilField)
  }, [selectedOilField])

  const filteredData = useMemo(() => {
    let data = productionHistory
    if (dateRange) {
      const start = dateRange[0].format('YYYY-MM-DD')
      const end = dateRange[1].format('YYYY-MM-DD')
      data = data.filter((d) => d.date >= start && d.date <= end)
    }
    if (selectedOilField) {
      const wellIds = wellList.filter((w) => w.oilField === selectedOilField).map((w) => w.id)
      data = data.filter((d) => wellIds.includes(d.wellId))
    }
    if (selectedWellId) {
      data = data.filter((d) => d.wellId === selectedWellId)
    }
    return data
  }, [dateRange, selectedOilField, selectedWellId])

  const summaryStats = useMemo(() => {
    const totalLiquid = filteredData.reduce((s, d) => s + d.liquidVolume, 0)
    const totalOil = filteredData.reduce((s, d) => s + d.oilVolume, 0)
    const totalWater = filteredData.reduce((s, d) => s + d.waterVolume, 0)
    const totalGas = filteredData.reduce((s, d) => s + d.gasVolume, 0)
    const avgWaterCut = filteredData.length > 0
      ? filteredData.reduce((s, d) => s + d.waterCut, 0) / filteredData.length
      : 0
    return {
      totalLiquid: totalLiquid.toFixed(1),
      totalOil: totalOil.toFixed(1),
      totalWater: totalWater.toFixed(1),
      totalGas: totalGas.toFixed(1),
      avgWaterCut: avgWaterCut.toFixed(1),
    }
  }, [filteredData])

  const trendOption = useMemo(() => {
    const dateMap = new Map<string, { liquid: number; oil: number; water: number }>()
    filteredData.forEach((d) => {
      const existing = dateMap.get(d.date) ?? { liquid: 0, oil: 0, water: 0 }
      existing.liquid += d.liquidVolume
      existing.oil += d.oilVolume
      existing.water += d.waterVolume
      dateMap.set(d.date, existing)
    })
    const dates = [...dateMap.keys()].sort()
    const liquidArr = dates.map((d) => +(dateMap.get(d)!.liquid.toFixed(1)))
    const oilArr = dates.map((d) => +(dateMap.get(d)!.oil.toFixed(1)))
    const waterArr = dates.map((d) => +(dateMap.get(d)!.water.toFixed(1)))

    return {
      title: { text: '产量趋势', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['产液量', '产油量', '产水量'], top: 30 },
      grid: { left: 70, right: 30, top: 65, bottom: 40 },
      xAxis: { type: 'category' as const, data: dates, axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: { type: 'value' as const, name: '产量 (t)' },
      dataZoom: [{ type: 'inside' as const }],
      series: [
        {
          name: '产液量',
          type: 'line' as const,
          data: liquidArr,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#1890ff' },
          itemStyle: { color: '#1890ff' },
          areaStyle: { color: 'rgba(24,144,255,0.1)' },
        },
        {
          name: '产油量',
          type: 'line' as const,
          data: oilArr,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#52c41a' },
          itemStyle: { color: '#52c41a' },
          areaStyle: { color: 'rgba(82,196,26,0.1)' },
        },
        {
          name: '产水量',
          type: 'line' as const,
          data: waterArr,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#faad14' },
          itemStyle: { color: '#faad14' },
        },
      ],
    }
  }, [filteredData])

  const wellCompareOption = useMemo(() => {
    const wellMap = new Map<string, { name: string; liquid: number; oil: number; count: number }>()
    filteredData.forEach((d) => {
      const existing = wellMap.get(d.wellId) ?? { name: d.wellName, liquid: 0, oil: 0, count: 0 }
      existing.liquid += d.liquidVolume
      existing.oil += d.oilVolume
      existing.count += 1
      wellMap.set(d.wellId, existing)
    })
    const entries = [...wellMap.entries()].sort((a, b) => b[1].liquid - a[1].liquid)
    const names = entries.map(([, v]) => v.name)
    const avgLiquid = entries.map(([, v]) => +(v.liquid / (v.count || 1)).toFixed(1))
    const avgOil = entries.map(([, v]) => +(v.oil / (v.count || 1)).toFixed(1))

    return {
      title: { text: '单井日均产量对比', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['日均产液量', '日均产油量'], top: 30 },
      grid: { left: 80, right: 30, top: 65, bottom: 60 },
      xAxis: {
        type: 'category' as const,
        data: names,
        axisLabel: { rotate: 30, fontSize: 10 },
      },
      yAxis: { type: 'value' as const, name: '产量 (t/d)' },
      series: [
        {
          name: '日均产液量',
          type: 'bar' as const,
          data: avgLiquid,
          barWidth: '30%',
          itemStyle: { color: '#1890ff', borderRadius: [4, 4, 0, 0] },
        },
        {
          name: '日均产油量',
          type: 'bar' as const,
          data: avgOil,
          barWidth: '30%',
          itemStyle: { color: '#52c41a', borderRadius: [4, 4, 0, 0] },
        },
      ],
    }
  }, [filteredData])

  const waterCutTrendOption = useMemo(() => {
    const dateMap = new Map<string, { totalWaterCut: number; count: number }>()
    filteredData.forEach((d) => {
      const existing = dateMap.get(d.date) ?? { totalWaterCut: 0, count: 0 }
      existing.totalWaterCut += d.waterCut
      existing.count += 1
      dateMap.set(d.date, existing)
    })
    const dates = [...dateMap.keys()].sort()
    const avgWaterCuts = dates.map((d) => {
      const e = dateMap.get(d)!
      return +(e.totalWaterCut / e.count).toFixed(1)
    })

    return {
      title: { text: '含水率变化趋势', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' as const, formatter: '{b}<br/>平均含水率: {c}%' },
      grid: { left: 60, right: 30, top: 50, bottom: 40 },
      xAxis: { type: 'category' as const, data: dates, axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: { type: 'value' as const, name: '含水率 (%)', min: 50, max: 100 },
      dataZoom: [{ type: 'inside' as const }],
      series: [
        {
          type: 'line' as const,
          data: avgWaterCuts,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { color: '#ff7a45', width: 2 },
          itemStyle: { color: '#ff7a45' },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0, y: 0, x2: 0, y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255,122,69,0.3)' },
                { offset: 1, color: 'rgba(255,122,69,0.02)' },
              ],
            },
          },
          markLine: {
            data: [{ yAxis: 80, name: '高含水线', lineStyle: { color: '#ff4d4f', type: 'dashed' as const } }],
            label: { formatter: '高含水线 80%' },
          },
        },
      ],
    }
  }, [filteredData])

  const tableColumns: ColumnsType<ProductionRecord> = [
    { title: '日期', dataIndex: 'date', width: 110, sorter: (a, b) => a.date.localeCompare(b.date) },
    { title: '井名', dataIndex: 'wellName', width: 120 },
    { title: '产液量 (t)', dataIndex: 'liquidVolume', width: 100, sorter: (a, b) => a.liquidVolume - b.liquidVolume },
    { title: '产油量 (t)', dataIndex: 'oilVolume', width: 100, sorter: (a, b) => a.oilVolume - b.oilVolume },
    { title: '产水量 (t)', dataIndex: 'waterVolume', width: 100 },
    { title: '产气量 (m³)', dataIndex: 'gasVolume', width: 110 },
    {
      title: '含水率 (%)',
      dataIndex: 'waterCut',
      width: 100,
      sorter: (a, b) => a.waterCut - b.waterCut,
      render: (v: number) => (
        <span style={{ color: v > 80 ? '#ff4d4f' : v > 70 ? '#faad14' : '#52c41a' }}>
          {v}
        </span>
      ),
    },
    {
      title: '泵效 (%)',
      dataIndex: 'pumpEfficiency',
      width: 90,
      sorter: (a, b) => a.pumpEfficiency - b.pumpEfficiency,
      render: (v: number) => (
        <span style={{ color: v < 30 ? '#ff4d4f' : v < 40 ? '#faad14' : '#52c41a' }}>
          {v}
        </span>
      ),
    },
  ]

  const tableData = useMemo(
    () => filteredData.map((d, i) => ({ ...d, key: `${d.date}-${d.wellId}-${i}` })),
    [filteredData],
  )

  const handleExport = () => {
    message.success(`已导出 ${filteredData.length} 条产量数据（模拟）`)
  }

  return (
    <div className="page-container" style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card
        title={
          <span>
            <ExperimentOutlined style={{ marginRight: 8 }} />
            产液计量管理
          </span>
        }
        extra={
          <Space wrap>
            <RangePicker
              value={dateRange}
              onChange={(v) => v && setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs])}
            />
            <Select
              style={{ width: 140 }}
              placeholder="选择油田"
              allowClear
              value={selectedOilField}
              onChange={(v) => {
                setSelectedOilField(v)
                setSelectedWellId(undefined)
              }}
              options={oilFields.map((f) => ({ value: f, label: f }))}
            />
            <Select
              style={{ width: 180 }}
              placeholder="选择井"
              allowClear
              showSearch
              optionFilterProp="label"
              value={selectedWellId}
              onChange={setSelectedWellId}
              options={filteredWells.map((w) => ({ value: w.id, label: w.name }))}
            />
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出数据
            </Button>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Row gutter={16}>
          <Col span={5}>
            <Statistic
              title="总产液量"
              value={summaryStats.totalLiquid}
              suffix="t"
              prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="总产油量"
              value={summaryStats.totalOil}
              suffix="t"
              prefix={<RiseOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="总产水量"
              value={summaryStats.totalWater}
              suffix="t"
              prefix={<FallOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="总产气量"
              value={summaryStats.totalGas}
              suffix="m³"
              valueStyle={{ color: '#722ed1' }}
            />
          </Col>
          <Col span={5}>
            <Statistic
              title="平均含水率"
              value={summaryStats.avgWaterCut}
              suffix="%"
              valueStyle={{
                color: parseFloat(summaryStats.avgWaterCut) > 80 ? '#ff4d4f' : '#1890ff',
              }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card bodyStyle={{ padding: 12 }}>
            <ReactECharts option={trendOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={10}>
          <Card bodyStyle={{ padding: 12 }}>
            <ReactECharts option={wellCompareOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      <Card bodyStyle={{ padding: 12 }} style={{ marginBottom: 16 }}>
        <ReactECharts option={waterCutTrendOption} style={{ height: 260 }} />
      </Card>

      <Card
        title="产量数据明细"
        extra={<span style={{ color: '#888' }}>共 {filteredData.length} 条记录</span>}
      >
        <Table
          columns={tableColumns as any}
          dataSource={tableData}
          pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          size="small"
          scroll={{ y: 400 }}
        />
      </Card>
    </div>
  )
}

export default LiquidMeasurement
