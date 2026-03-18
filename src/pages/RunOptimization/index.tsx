import React, { useState, useMemo } from 'react'
import { Row, Col, Card, Table, Tag, Statistic, Steps, Empty, Space, Divider } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  AlertOutlined,
  ThunderboltOutlined,
  RiseOutlined,
  ToolOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { wellList, optimizationSuggestions } from '../../mock/wellData'

const priorityConfig: Record<string, { color: string; label: string }> = {
  urgent: { color: '#ff4d4f', label: '紧急' },
  high: { color: '#fa8c16', label: '高' },
  medium: { color: '#fadb14', label: '中' },
  low: { color: '#52c41a', label: '低' },
}

const RunOptimization: React.FC = () => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0)

  const selected = optimizationSuggestions[selectedIdx]
  const selectedWell = wellList.find(w => w.id === selected.wellId)

  const urgentCount = optimizationSuggestions.filter(s => s.priority === 'urgent').length
  const estimatedSaving = useMemo(() => {
    return optimizationSuggestions.reduce((sum, s) => {
      const well = wellList.find(w => w.id === s.wellId)
      return sum + (well ? well.power * 0.12 : 0)
    }, 0)
  }, [])
  const estimatedProduction = useMemo(() => {
    return optimizationSuggestions.filter(s => s.type === '增产建议').reduce((sum, s) => {
      const match = s.expectedImprovement.match(/日产油增加(\d+)/)
      return sum + (match ? parseInt(match[1]) : 0)
    }, 0)
  }, [])

  const columns: ColumnsType<typeof optimizationSuggestions[0]> = [
    { title: '井号', dataIndex: 'wellName', width: 120 },
    { title: '优化类型', dataIndex: 'type', width: 100, render: (v: string) => <Tag color="blue">{v}</Tag> },
    {
      title: '优先级', dataIndex: 'priority', width: 90, align: 'center',
      sorter: (a, b) => {
        const order = { urgent: 0, high: 1, medium: 2, low: 3 }
        return (order[a.priority as keyof typeof order] ?? 4) - (order[b.priority as keyof typeof order] ?? 4)
      },
      render: (p: string) => {
        const cfg = priorityConfig[p]
        return cfg ? <Tag color={cfg.color}>{cfg.label}</Tag> : p
      },
    },
    { title: '当前值', dataIndex: 'currentValue', width: 120 },
    { title: '建议值', dataIndex: 'suggestedValue', width: 120 },
    { title: '预期改善', dataIndex: 'expectedImprovement', ellipsis: true },
    { title: '原因', dataIndex: 'reason', ellipsis: true },
  ]

  const compareOption = selectedWell ? {
    tooltip: { trigger: 'axis' },
    legend: { data: ['当前值', '优化后'], bottom: 0 },
    grid: { top: 30, right: 20, bottom: 50, left: 60 },
    xAxis: { type: 'category', data: ['频率(Hz)', '电流(A)', '功率(kW)', '温度(°C)', '振动(mm/s)'] },
    yAxis: { type: 'value' },
    series: [
      {
        name: '当前值', type: 'bar', barWidth: 30,
        data: [selectedWell.frequency, selectedWell.current, selectedWell.power, selectedWell.temperature, selectedWell.vibration],
        itemStyle: { color: '#ff7875' },
      },
      {
        name: '优化后', type: 'bar', barWidth: 30,
        data: [
          selectedWell.frequency * 0.85,
          selectedWell.current * 0.88,
          selectedWell.power * 0.82,
          selectedWell.temperature * 0.9,
          selectedWell.vibration * 0.7,
        ].map(v => Math.round(v * 10) / 10),
        itemStyle: { color: '#52c41a' },
      },
    ],
  } : {}

  const effectOption = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => `第${i + 1}天`)
    const baseEff = selectedWell?.efficiency || 40
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['泵效(%)', '产液量(t/d)'], bottom: 0 },
      grid: { top: 30, right: 60, bottom: 50, left: 60 },
      xAxis: { type: 'category', data: days },
      yAxis: [
        { type: 'value', name: '泵效(%)', min: 0, max: 80 },
        { type: 'value', name: '产液量(t/d)', min: 0, max: 100 },
      ],
      series: [
        {
          name: '泵效(%)', type: 'line', smooth: true,
          data: days.map((_, i) => Math.round((baseEff + Math.min(15, i * 0.6) + (Math.random() - 0.5) * 3) * 10) / 10),
          itemStyle: { color: '#1677ff' },
        },
        {
          name: '产液量(t/d)', type: 'line', smooth: true, yAxisIndex: 1,
          data: days.map((_, i) => {
            const base = selectedWell?.dailyLiquid || 40
            return Math.round((base + Math.min(10, i * 0.4) + (Math.random() - 0.5) * 2) * 10) / 10
          }),
          itemStyle: { color: '#fa8c16' },
        },
      ],
    }
  }, [selectedWell])

  const freqOption = useMemo(() => {
    const freqs = Array.from({ length: 21 }, (_, i) => 30 + i)
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['泵效(%)', '产液量(t/d)'], bottom: 0 },
      grid: { top: 30, right: 60, bottom: 50, left: 60 },
      xAxis: { type: 'category', data: freqs.map(f => `${f}Hz`), name: '频率' },
      yAxis: [
        { type: 'value', name: '泵效(%)', min: 0, max: 70 },
        { type: 'value', name: '产液量(t/d)', min: 0, max: 100 },
      ],
      series: [
        {
          name: '泵效(%)', type: 'line', smooth: true,
          data: freqs.map(f => {
            const peak = 40
            return Math.round((55 - 0.08 * (f - peak) ** 2 + (Math.random() - 0.5) * 2) * 10) / 10
          }),
          itemStyle: { color: '#1677ff' },
          markLine: {
            data: [{ xAxis: selectedWell ? `${selectedWell.frequency}Hz` : '42Hz', name: '当前频率' }],
            label: { formatter: '当前频率' },
            lineStyle: { color: '#ff4d4f', type: 'dashed' },
          },
        },
        {
          name: '产液量(t/d)', type: 'line', smooth: true, yAxisIndex: 1,
          data: freqs.map(f => Math.round((f * 1.8 - 20 + (Math.random() - 0.5) * 3) * 10) / 10),
          itemStyle: { color: '#fa8c16' },
        },
      ],
    }
  }, [selectedWell])

  const energyOption = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['优化前(kWh/t)', '优化后(kWh/t)'], bottom: 0 },
    grid: { top: 30, right: 20, bottom: 50, left: 60 },
    xAxis: {
      type: 'category',
      data: optimizationSuggestions.map(s => s.wellName),
      axisLabel: { rotate: 20 },
    },
    yAxis: { type: 'value', name: '单位能耗(kWh/t)' },
    series: [
      {
        name: '优化前(kWh/t)', type: 'bar', barWidth: 24,
        data: optimizationSuggestions.map(s => {
          const w = wellList.find(wl => wl.id === s.wellId)
          return w && w.dailyLiquid > 0 ? Math.round(w.power * 24 / w.dailyLiquid * 10) / 10 : 0
        }),
        itemStyle: { color: '#ff7875' },
      },
      {
        name: '优化后(kWh/t)', type: 'bar', barWidth: 24,
        data: optimizationSuggestions.map(s => {
          const w = wellList.find(wl => wl.id === s.wellId)
          return w && w.dailyLiquid > 0 ? Math.round(w.power * 24 / w.dailyLiquid * 0.82 * 10) / 10 : 0
        }),
        itemStyle: { color: '#52c41a' },
      },
    ],
  }

  const stepsItems = [
    { title: '诊断分析', description: '确认工况问题与优化方向' },
    { title: '方案制定', description: '确定参数调整范围与目标' },
    { title: '模拟验证', description: '数值模拟验证优化效果' },
    { title: '现场实施', description: '按方案调整运行参数' },
    { title: '效果跟踪', description: '持续监测优化后运行数据' },
  ]

  return (
    <div className="page-container">
      <Row gutter={[16, 16]}>
        {[
          { title: '待优化井数', value: optimizationSuggestions.length, icon: <ToolOutlined />, color: '#1677ff', suffix: '口' },
          { title: '紧急优化', value: urgentCount, icon: <AlertOutlined />, color: '#ff4d4f', suffix: '口' },
          { title: '预计节能量', value: Math.round(estimatedSaving), icon: <ThunderboltOutlined />, color: '#52c41a', suffix: 'kWh/d' },
          { title: '预计增产量', value: estimatedProduction, icon: <RiseOutlined />, color: '#fa8c16', suffix: 't/d' },
        ].map(item => (
          <Col xs={12} sm={12} md={6} key={item.title}>
            <Card className="stat-card" hoverable>
              <Statistic title={item.title} value={item.value} suffix={item.suffix} prefix={item.icon} valueStyle={{ color: item.color, fontWeight: 600 }} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card title="优化建议列表" className="chart-card" style={{ marginTop: 16 }}>
        <Table
          columns={columns}
          dataSource={optimizationSuggestions}
          rowKey="wellId"
          size="middle"
          pagination={false}
          onRow={(_, index) => ({
            onClick: () => setSelectedIdx(index ?? 0),
            style: { cursor: 'pointer', background: index === selectedIdx ? '#e6f4ff' : undefined },
          })}
        />
      </Card>

      <Card
        title={<Space><ExperimentOutlined />优化方案详情 — {selected.wellName}</Space>}
        className="chart-card"
        style={{ marginTop: 16 }}
      >
        {selectedWell ? (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={12}>
                <Card type="inner" title="参数调整前后对比" size="small">
                  <ReactECharts option={compareOption} style={{ height: 300 }} />
                </Card>
              </Col>
              <Col xs={24} md={12}>
                <Card type="inner" title="预期效果曲线" size="small">
                  <ReactECharts option={effectOption} style={{ height: 300 }} />
                </Card>
              </Col>
            </Row>
            <Divider />
            <Card type="inner" title="实施步骤" size="small">
              <Steps
                current={0}
                items={stepsItems.map((s, i) => ({
                  title: s.title,
                  description: s.description,
                  icon: i === 0 ? <ClockCircleOutlined /> : <CheckCircleOutlined />,
                }))}
              />
            </Card>
          </>
        ) : (
          <Empty description="未找到对应井数据" />
        )}
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={12}>
          <Card title="频率优化曲线" className="chart-card">
            <ReactECharts option={freqOption} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="节能分析 — 优化前后能耗对比" className="chart-card">
            <ReactECharts option={energyOption} style={{ height: 350 }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default RunOptimization
