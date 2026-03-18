import React, { useState, useMemo } from 'react'
import {
  Card,
  Select,
  Row,
  Col,
  Tag,
  Timeline,
  Table,
  Alert,
  Space,
  DatePicker,
  List,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DashboardOutlined,
  ExperimentOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  BulbOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import { wellList, generateTimeSeriesData } from '../../mock/wellData'

const { RangePicker } = DatePicker

interface ParamConfig {
  key: string
  label: string
  unit: string
  min: number
  max: number
  color: string
  field: keyof typeof wellList[0]
}

const paramConfigs: ParamConfig[] = [
  { key: 'current', label: '电流', unit: 'A', min: 15, max: 35, color: '#1890ff', field: 'current' },
  { key: 'temperature', label: '温度', unit: '°C', min: 60, max: 100, color: '#ff4d4f', field: 'temperature' },
  { key: 'vibration', label: '振动', unit: 'mm/s', min: 0, max: 5, color: '#faad14', field: 'vibration' },
  { key: 'casingPressure', label: '套压', unit: 'MPa', min: 1.5, max: 5, color: '#52c41a', field: 'casingPressure' },
  { key: 'tubingPressure', label: '油压', unit: 'MPa', min: 1.0, max: 3.5, color: '#722ed1', field: 'tubingPressure' },
  { key: 'frequency', label: '频率', unit: 'Hz', min: 30, max: 50, color: '#13c2c2', field: 'frequency' },
]

interface AnomalyRow {
  key: string
  param: string
  unit: string
  value: number
  min: number
  max: number
  status: 'normal' | 'warning' | 'alarm'
}

const MultiParamDiagnosis: React.FC = () => {
  const [selectedWellId, setSelectedWellId] = useState(wellList[0].id)
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(1, 'day'),
    dayjs(),
  ])
  const [xParam, setXParam] = useState('current')
  const [yParam, setYParam] = useState('temperature')

  const selectedWell = useMemo(
    () => wellList.find((w) => w.id === selectedWellId) ?? wellList[0],
    [selectedWellId],
  )

  const trendSeriesData = useMemo(() => {
    const hours = dateRange ? dateRange[1].diff(dateRange[0], 'hour') : 24
    return generateTimeSeriesData(Math.min(hours, 72))
  }, [selectedWellId, dateRange])

  const multiTrendOption = useMemo(() => {
    const timeLabels = trendSeriesData.map((d) => d.time)
    const series = paramConfigs.map((cfg) => {
      const baseValue = selectedWell[cfg.field] as number
      return {
        name: cfg.label,
        type: 'line' as const,
        yAxisIndex: 0,
        smooth: true,
        symbol: 'none',
        lineStyle: { color: cfg.color, width: 1.5 },
        data: trendSeriesData.map((d) => {
          const scale = baseValue / 30
          return +(d.value * scale + (Math.random() - 0.5) * baseValue * 0.05).toFixed(2)
        }),
      }
    })
    return {
      title: { text: '多参数趋势对比', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' as const },
      legend: {
        data: paramConfigs.map((c) => c.label),
        top: 30,
        selected: paramConfigs.reduce(
          (acc, c) => ({ ...acc, [c.label]: true }),
          {} as Record<string, boolean>,
        ),
      },
      grid: { left: 60, right: 60, top: 70, bottom: 40 },
      xAxis: { type: 'category' as const, data: timeLabels },
      yAxis: [{ type: 'value' as const, name: '参数值' }],
      dataZoom: [{ type: 'inside' as const }, { type: 'slider' as const, height: 20, bottom: 5 }],
      series,
    }
  }, [trendSeriesData, selectedWell])

  const scatterData = useMemo(() => {
    const xCfg = paramConfigs.find((c) => c.key === xParam)!
    const yCfg = paramConfigs.find((c) => c.key === yParam)!
    const xBase = selectedWell[xCfg.field] as number
    const yBase = selectedWell[yCfg.field] as number
    return trendSeriesData.map((d) => {
      const xVal = xBase + (d.value - 30) * (xBase / 30) + (Math.random() - 0.5) * xBase * 0.1
      const yVal = yBase + (d.value - 30) * (yBase / 30) * 0.6 + (Math.random() - 0.5) * yBase * 0.1
      return [+xVal.toFixed(2), +yVal.toFixed(2)]
    })
  }, [trendSeriesData, selectedWell, xParam, yParam])

  const scatterOption = useMemo(() => {
    const xCfg = paramConfigs.find((c) => c.key === xParam)!
    const yCfg = paramConfigs.find((c) => c.key === yParam)!
    return {
      title: { text: '参数相关性分析', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: {
        formatter: (params: any) =>
          `${xCfg.label}: ${params.data[0]} ${xCfg.unit}<br/>${yCfg.label}: ${params.data[1]} ${yCfg.unit}`,
      },
      grid: { left: 70, right: 30, top: 50, bottom: 50 },
      xAxis: { type: 'value' as const, name: `${xCfg.label} (${xCfg.unit})`, nameLocation: 'middle' as const, nameGap: 30 },
      yAxis: { type: 'value' as const, name: `${yCfg.label} (${yCfg.unit})` },
      series: [
        {
          type: 'scatter' as const,
          data: scatterData,
          symbolSize: 8,
          itemStyle: { color: '#1890ff', opacity: 0.6 },
        },
      ],
    }
  }, [scatterData, xParam, yParam])

  const anomalyData: AnomalyRow[] = useMemo(() => {
    return paramConfigs.map((cfg) => {
      const value = selectedWell[cfg.field] as number
      let status: 'normal' | 'warning' | 'alarm' = 'normal'
      if (value < cfg.min * 0.8 || value > cfg.max * 1.2) status = 'alarm'
      else if (value < cfg.min || value > cfg.max) status = 'warning'
      return {
        key: cfg.key,
        param: cfg.label,
        unit: cfg.unit,
        value,
        min: cfg.min,
        max: cfg.max,
        status,
      }
    })
  }, [selectedWell])

  const anomalyColumns: ColumnsType<AnomalyRow> = [
    { title: '参数', dataIndex: 'param', width: 80 },
    { title: '当前值', dataIndex: 'value', width: 100, render: (v, r) => `${v} ${r.unit}` },
    { title: '正常下限', dataIndex: 'min', width: 100, render: (v, r) => `${v} ${r.unit}` },
    { title: '正常上限', dataIndex: 'max', width: 100, render: (v, r) => `${v} ${r.unit}` },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => {
        const map: Record<string, { color: string; text: string }> = {
          normal: { color: 'green', text: '正常' },
          warning: { color: 'orange', text: '预警' },
          alarm: { color: 'red', text: '报警' },
        }
        const cfg = map[s] ?? map.normal
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
  ]

  const diagnosisResult = useMemo(() => {
    const alarms = anomalyData.filter((d) => d.status === 'alarm')
    const warnings = anomalyData.filter((d) => d.status === 'warning')

    const steps = [
      { title: '数据采集', desc: `已采集 ${paramConfigs.length} 项参数`, status: 'finish' as const },
      { title: '阈值检测', desc: `${alarms.length} 项报警, ${warnings.length} 项预警`, status: (alarms.length > 0 ? 'error' : warnings.length > 0 ? 'process' : 'finish') as any },
      { title: '关联分析', desc: '分析参数间相关性', status: 'finish' as const },
      { title: '综合诊断', desc: '生成诊断结论', status: 'finish' as const },
    ]

    let level: 'success' | 'warning' | 'error' = 'success'
    let conclusion = '设备运行正常，各项参数均在合理范围内。'
    const suggestions: string[] = []

    if (alarms.length > 0) {
      level = 'error'
      conclusion = `检测到 ${alarms.length} 项参数异常报警，需要立即处理。`
      alarms.forEach((a) => suggestions.push(`${a.param}(${a.value}${a.unit})超出正常范围[${a.min}~${a.max}]，建议排查原因`))
    }
    if (warnings.length > 0) {
      if (level !== 'error') level = 'warning'
      if (alarms.length === 0) conclusion = `检测到 ${warnings.length} 项参数预警，建议关注。`
      warnings.forEach((w) => suggestions.push(`${w.param}(${w.value}${w.unit})接近阈值边界，建议持续监测`))
    }
    if (suggestions.length === 0) {
      suggestions.push('维持当前运行参数', '按计划执行日常巡检', '关注长期趋势变化')
    }

    return { steps, level, conclusion, suggestions }
  }, [anomalyData])

  return (
    <div className="page-container" style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card
        title={
          <span>
            <DashboardOutlined style={{ marginRight: 8 }} />
            多参数综合诊断
          </span>
        }
        extra={
          <Space>
            <RangePicker
              value={dateRange}
              onChange={(v) => v && setDateRange(v as [dayjs.Dayjs, dayjs.Dayjs])}
              style={{ width: 260 }}
            />
            <Select
              style={{ width: 260 }}
              value={selectedWellId}
              onChange={setSelectedWellId}
              showSearch
              optionFilterProp="label"
              options={wellList.map((w) => ({
                value: w.id,
                label: `${w.name} (${w.pumpType}) - ${w.oilField}`,
              }))}
            />
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <ReactECharts option={multiTrendOption} style={{ height: 350 }} />
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card
            title={
              <span>
                <ExperimentOutlined style={{ marginRight: 8 }} />
                参数相关性分析
              </span>
            }
            extra={
              <Space>
                <span>X轴:</span>
                <Select
                  size="small"
                  style={{ width: 100 }}
                  value={xParam}
                  onChange={setXParam}
                  options={paramConfigs.map((c) => ({ value: c.key, label: c.label }))}
                />
                <span>Y轴:</span>
                <Select
                  size="small"
                  style={{ width: 100 }}
                  value={yParam}
                  onChange={setYParam}
                  options={paramConfigs.map((c) => ({ value: c.key, label: c.label }))}
                />
              </Space>
            }
          >
            <ReactECharts option={scatterOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={10}>
          <Card
            title={
              <span>
                <WarningOutlined style={{ marginRight: 8 }} />
                参数异常检测
              </span>
            }
          >
            <Table<AnomalyRow>
              columns={anomalyColumns}
              dataSource={anomalyData}
              pagination={false}
              size="small"
              rowClassName={(r) =>
                r.status === 'alarm'
                  ? 'ant-table-row-alarm'
                  : r.status === 'warning'
                    ? 'ant-table-row-warning'
                    : ''
              }
            />
          </Card>
        </Col>
      </Row>

      <Card title="综合诊断面板" style={{ marginBottom: 16 }}>
        <Row gutter={24}>
          <Col span={8}>
            <div style={{ padding: '0 12px' }}>
              <h4 style={{ marginBottom: 16 }}>诊断流程</h4>
              <Timeline
                items={diagnosisResult.steps.map((s) => ({
                  color:
                    s.status === 'finish'
                      ? 'green'
                      : s.status === 'error'
                        ? 'red'
                        : 'blue',
                  dot:
                    s.status === 'finish' ? (
                      <CheckCircleOutlined />
                    ) : s.status === 'error' ? (
                      <CloseCircleOutlined />
                    ) : undefined,
                  children: (
                    <>
                      <div style={{ fontWeight: 500 }}>{s.title}</div>
                      <div style={{ color: '#888', fontSize: 12 }}>{s.desc}</div>
                    </>
                  ),
                }))}
              />
            </div>
          </Col>
          <Col span={8}>
            <h4 style={{ marginBottom: 16 }}>诊断结论</h4>
            <Alert
              type={diagnosisResult.level}
              showIcon
              message={
                diagnosisResult.level === 'success'
                  ? '运行正常'
                  : diagnosisResult.level === 'warning'
                    ? '存在预警'
                    : '存在报警'
              }
              description={diagnosisResult.conclusion}
              style={{ marginBottom: 16 }}
            />
            <div>
              <Tag color={diagnosisResult.level === 'success' ? 'green' : diagnosisResult.level === 'warning' ? 'orange' : 'red'}>
                {selectedWell.name}
              </Tag>
              <Tag>{selectedWell.pumpType}</Tag>
              <Tag>运行 {selectedWell.runDays} 天</Tag>
              <Tag>泵效 {selectedWell.efficiency}%</Tag>
            </div>
          </Col>
          <Col span={8}>
            <h4 style={{ marginBottom: 16 }}>
              <BulbOutlined style={{ marginRight: 8 }} />
              建议措施
            </h4>
            <List
              size="small"
              dataSource={diagnosisResult.suggestions}
              renderItem={(item, idx) => (
                <List.Item style={{ padding: '8px 0' }}>
                  <Tag color="blue" style={{ marginRight: 8 }}>
                    {idx + 1}
                  </Tag>
                  {item}
                </List.Item>
              )}
            />
          </Col>
        </Row>
      </Card>
    </div>
  )
}

export default MultiParamDiagnosis
