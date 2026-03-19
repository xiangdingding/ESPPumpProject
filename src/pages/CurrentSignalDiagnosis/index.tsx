import React, { useState, useMemo } from 'react'
import { Card, Select, Row, Col, Statistic, Alert, Tag, Descriptions, Divider } from 'antd'
import {
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  LineChartOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { wellList, generateCurrentSignalData, generateTimeSeriesData } from '../../mock/wellData'

const statusColorMap: Record<string, string> = {
  normal: '#52c41a',
  warning: '#faad14',
  alarm: '#ff4d4f',
  offline: '#d9d9d9',
}

const CurrentSignalDiagnosis: React.FC = () => {
  const [selectedWellId, setSelectedWellId] = useState(wellList[0].id)

  const selectedWell = useMemo(
    () => wellList.find((w) => w.id === selectedWellId) ?? wellList[0],
    [selectedWellId],
  )

  const signalData = useMemo(() => generateCurrentSignalData(500), [selectedWellId])
  const trendData = useMemo(() => generateTimeSeriesData(24), [selectedWellId])

  const stats = useMemo(() => {
    const values = signalData.map((d) => d.value)
    const max = Math.max(...values)
    const min = Math.min(...values)
    const avg = values.reduce((s, v) => s + v, 0) / values.length
    const rms = Math.sqrt(values.reduce((s, v) => s + v * v, 0) / values.length)
    const peakToPeak = max - min
    const formFactor = rms / (Math.abs(avg) || 1)
    const positiveValues = values.filter((v) => v > 0)
    const negativeValues = values.filter((v) => v < 0)
    const avgPositive =
      positiveValues.length > 0
        ? positiveValues.reduce((s, v) => s + v, 0) / positiveValues.length
        : 0
    const avgNegative =
      negativeValues.length > 0
        ? Math.abs(negativeValues.reduce((s, v) => s + v, 0) / negativeValues.length)
        : 0
    const imbalance =
      avgPositive + avgNegative > 0
        ? (Math.abs(avgPositive - avgNegative) / ((avgPositive + avgNegative) / 2)) * 100
        : 0

    return {
      max: max.toFixed(2),
      min: min.toFixed(2),
      avg: avg.toFixed(2),
      rms: rms.toFixed(2),
      peakToPeak: peakToPeak.toFixed(2),
      formFactor: formFactor.toFixed(3),
      imbalance: imbalance.toFixed(1),
    }
  }, [signalData])

  const spectrumData = useMemo(() => {
    const baseFreq = selectedWell.frequency
    return [
      { name: `基频 ${baseFreq}Hz`, value: 30.0 },
      { name: `2次 ${baseFreq * 2}Hz`, value: 5.2 },
      { name: `3次 ${baseFreq * 3}Hz`, value: 2.1 },
      { name: `4次 ${baseFreq * 4}Hz`, value: 0.8 },
      { name: `5次 ${baseFreq * 5}Hz`, value: 0.3 },
      { name: `6次 ${baseFreq * 6}Hz`, value: 0.15 },
    ]
  }, [selectedWell])

  const diagnosis = useMemo(() => {
    const current = selectedWell.current
    const ratedCurrent = 30
    const ratio = current / ratedCurrent

    if (selectedWell.status === 'offline') {
      return { level: 'error' as const, tag: '离线', color: '#d9d9d9', messages: ['设备离线，无电流信号'] }
    }
    if (ratio > 1.2) {
      return {
        level: 'error' as const,
        tag: '过载',
        color: '#ff4d4f',
        messages: [
          `电流 ${current}A 超过额定值 ${(ratio * 100).toFixed(0)}%`,
          '建议检查泵负荷，排查管路堵塞或机械卡阻',
          '持续过载将导致电机过热烧毁',
        ],
      }
    }
    if (ratio < 0.5) {
      return {
        level: 'warning' as const,
        tag: '欠载',
        color: '#faad14',
        messages: [
          `电流 ${current}A 仅为额定值 ${(ratio * 100).toFixed(0)}%`,
          '可能存在供液不足或气锁现象',
          '建议检查动液面和沉没度',
        ],
      }
    }
    if (parseFloat(stats.imbalance) > 15) {
      return {
        level: 'warning' as const,
        tag: '不平衡',
        color: '#fa8c16',
        messages: [
          `三相电流不平衡度 ${stats.imbalance}%，超过15%阈值`,
          '建议检查电缆连接和变压器',
        ],
      }
    }
    return {
      level: 'success' as const,
      tag: '正常',
      color: '#52c41a',
      messages: [
        `电流 ${current}A 在正常范围内`,
        '波形特征正常，无明显谐波畸变',
        '各项电流指标均在合理区间',
      ],
    }
  }, [selectedWell, stats])

  const waveformOption = useMemo(
    () => ({
      title: { text: '电流波形信号', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: {
        trigger: 'axis' as const,
        formatter: (params: any) => {
          const p = params[0]
          return `采样点: ${p.data[0]}<br/>电流: ${p.data[1].toFixed(2)} A`
        },
      },
      grid: { left: 60, right: 30, top: 50, bottom: 40 },
      xAxis: { type: 'value' as const, name: '采样点', nameLocation: 'middle' as const, nameGap: 25 },
      yAxis: { type: 'value' as const, name: '电流 (A)', axisLabel: { formatter: '{value}' } },
      dataZoom: [{ type: 'inside' as const }, { type: 'slider' as const, height: 20, bottom: 5 }],
      series: [
        {
          type: 'line' as const,
          data: signalData.map((d) => [d.index, d.value]),
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1.5, color: '#1890ff' },
          areaStyle: { color: 'rgba(24,144,255,0.08)' },
        },
      ],
    }),
    [signalData],
  )

  const dailyCardData = useMemo(() => {
    const baseCurrent = selectedWell.current
    const hours = Array.from({ length: 24 }, (_, i) => i)
    return hours.map(h => {
      const seed = h * 37 + selectedWell.id.charCodeAt(selectedWell.id.length - 1)
      const x = Math.sin(seed) * 10000
      const rand = x - Math.floor(x)
      const timeEffect = Math.sin((h - 6) / 24 * 2 * Math.PI) * 0.15
      const normalized = 0.3 + (0.5 + timeEffect + (rand - 0.5) * 0.3) * 0.5
      return {
        hour: h,
        value: Math.round(Math.max(0, Math.min(1, normalized)) * baseCurrent * 100) / 100,
        normalized: Math.round(Math.max(0, Math.min(1, normalized)) * 100) / 100,
      }
    })
  }, [selectedWell])

  const dailyCardOption = useMemo(() => {
    const hourLabels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
    const radarValues = dailyCardData.map(d => d.normalized)
    radarValues.push(radarValues[0])

    return {
      title: {
        text: '电流日卡片',
        left: 'center',
        top: 6,
        textStyle: { fontSize: 14, color: '#333' },
      },
      polar: { radius: ['8%', '70%'], center: ['50%', '55%'] },
      angleAxis: {
        type: 'category' as const,
        data: hourLabels,
        boundaryGap: false,
        startAngle: 90,
        axisLine: { lineStyle: { color: '#999' } },
        axisLabel: { fontSize: 11, color: '#666' },
        splitLine: { show: true, lineStyle: { color: '#e0e0e0', type: 'dashed' as const } },
      },
      radiusAxis: {
        min: 0,
        max: 1,
        splitNumber: 5,
        axisLabel: { fontSize: 10, color: '#999', formatter: (v: number) => v.toFixed(1) },
        axisLine: { lineStyle: { color: '#ccc' } },
        splitLine: { lineStyle: { color: '#e8e8e8' } },
      },
      tooltip: {
        trigger: 'item' as const,
        formatter: (params: any) => {
          const idx = params.dataIndex % 24
          const d = dailyCardData[idx]
          if (!d) return ''
          return `${String(d.hour).padStart(2, '0')}:00<br/>电流: ${d.value} A<br/>归一化: ${d.normalized}`
        },
      },
      series: [
        {
          type: 'line' as const,
          coordinateSystem: 'polar',
          data: radarValues,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          lineStyle: { width: 1.5, color: '#5b8c00' },
          areaStyle: {
            color: {
              type: 'radial',
              x: 0.5, y: 0.5, r: 0.7,
              colorStops: [
                { offset: 0, color: 'rgba(82,196,26,0.05)' },
                { offset: 1, color: 'rgba(82,196,26,0.35)' },
              ],
            },
          },
          itemStyle: { color: '#5b8c00' },
        },
      ],
      graphic: [{
        type: 'text' as const,
        left: 'center',
        top: 'middle',
        style: {
          text: selectedWell.name,
          fontSize: 13,
          fill: '#1677ff',
          fontWeight: 'bold' as const,
          textAlign: 'center' as const,
        },
        z: 100,
      }],
    }
  }, [dailyCardData, selectedWell])

  const spectrumOption = useMemo(
    () => ({
      title: { text: '频谱分析', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' as const, formatter: '{b}<br/>幅值: {c} A' },
      grid: { left: 60, right: 30, top: 50, bottom: 40 },
      xAxis: {
        type: 'category' as const,
        data: spectrumData.map((d) => d.name),
        axisLabel: { rotate: 20, fontSize: 11 },
      },
      yAxis: { type: 'value' as const, name: '幅值 (A)' },
      series: [
        {
          type: 'bar' as const,
          data: spectrumData.map((d) => d.value),
          barWidth: '50%',
          itemStyle: {
            color: (params: any) => {
              const colors = ['#1890ff', '#13c2c2', '#52c41a', '#faad14', '#fa8c16', '#f5222d']
              return colors[params.dataIndex % colors.length]
            },
          },
          label: { show: true, position: 'top' as const, formatter: '{c} A', fontSize: 11 },
        },
      ],
    }),
    [spectrumData],
  )

  const trendOption = useMemo(
    () => ({
      title: { text: '历史电流趋势', left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['实际电流', '基线电流'], top: 30 },
      grid: { left: 60, right: 30, top: 60, bottom: 40 },
      xAxis: { type: 'category' as const, data: trendData.map((d) => d.time) },
      yAxis: { type: 'value' as const, name: '电流 (A)' },
      series: [
        {
          name: '实际电流',
          type: 'line' as const,
          data: trendData.map((d) => d.value.toFixed(2)),
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#1890ff' },
          areaStyle: { color: 'rgba(24,144,255,0.1)' },
        },
        {
          name: '基线电流',
          type: 'line' as const,
          data: trendData.map((d) => d.baseline.toFixed(2)),
          smooth: true,
          symbol: 'none',
          lineStyle: { color: '#52c41a', type: 'dashed' as const },
        },
      ],
    }),
    [trendData],
  )

  return (
    <div className="page-container" style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <Card
        title={
          <span>
            <ThunderboltOutlined style={{ marginRight: 8 }} />
            电流信号诊断
          </span>
        }
        extra={
          <Select
            style={{ width: 260 }}
            value={selectedWellId}
            onChange={setSelectedWellId}
            showSearch
            optionFilterProp="label"
            options={wellList.map((w) => ({
              value: w.id,
              label: `${w.name} (电潜泵) - ${w.oilField}`,
            }))}
          />
        }
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: '12px 24px' }}
      >
        <Descriptions size="small" column={6}>
          <Descriptions.Item label="泵型">电潜泵</Descriptions.Item>
          <Descriptions.Item label="频率">{selectedWell.frequency} Hz</Descriptions.Item>
          <Descriptions.Item label="电流">{selectedWell.current} A</Descriptions.Item>
          <Descriptions.Item label="电压">{selectedWell.voltage} V</Descriptions.Item>
          <Descriptions.Item label="功率">{selectedWell.power} kW</Descriptions.Item>
          <Descriptions.Item label="状态">
            <Tag color={statusColorMap[selectedWell.status]}>{selectedWell.status.toUpperCase()}</Tag>
          </Descriptions.Item>
        </Descriptions>

        <Divider style={{ margin: '12px 0' }} />

        <Row gutter={16}>
          <Col span={14}>
            <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13, color: '#333' }}>
              <LineChartOutlined style={{ marginRight: 6 }} />电流特征参数
            </div>
            <Row gutter={[16, 12]}>
              <Col span={6}>
                <Statistic title="最大值" value={stats.max} suffix="A" valueStyle={{ color: '#cf1322', fontSize: 18 }} />
              </Col>
              <Col span={6}>
                <Statistic title="最小值" value={stats.min} suffix="A" valueStyle={{ color: '#3f8600', fontSize: 18 }} />
              </Col>
              <Col span={6}>
                <Statistic title="平均值" value={stats.avg} suffix="A" valueStyle={{ fontSize: 18 }} />
              </Col>
              <Col span={6}>
                <Statistic title="有效值(RMS)" value={stats.rms} suffix="A" valueStyle={{ color: '#1890ff', fontSize: 18 }} />
              </Col>
              <Col span={8}>
                <Statistic title="峰峰值" value={stats.peakToPeak} suffix="A" valueStyle={{ fontSize: 18 }} />
              </Col>
              <Col span={8}>
                <Statistic title="波形因子" value={stats.formFactor} valueStyle={{ fontSize: 18 }} />
              </Col>
              <Col span={8}>
                <Statistic
                  title="不平衡度"
                  value={stats.imbalance}
                  suffix="%"
                  valueStyle={{ color: parseFloat(stats.imbalance) > 15 ? '#ff4d4f' : '#52c41a', fontSize: 18 }}
                />
              </Col>
            </Row>
          </Col>
          <Col span={10}>
            <div style={{ marginBottom: 4, fontWeight: 600, fontSize: 13, color: '#333' }}>
              {diagnosis.level === 'success' ? (
                <CheckCircleOutlined style={{ marginRight: 6, color: '#52c41a' }} />
              ) : (
                <WarningOutlined style={{ marginRight: 6, color: diagnosis.color }} />
              )}
              诊断结论
            </div>
            <div style={{ marginBottom: 8 }}>
              <Tag
                color={diagnosis.color}
                style={{ fontSize: 14, padding: '2px 12px', fontWeight: 600 }}
              >
                {diagnosis.tag}
              </Tag>
            </div>
            <Alert
              type={diagnosis.level}
              showIcon
              message={diagnosis.messages[0]}
              description={
                <ul style={{ margin: '4px 0 0', paddingLeft: 20 }}>
                  {diagnosis.messages.slice(1).map((msg, i) => (
                    <li key={i} style={{ marginBottom: 2, fontSize: 12 }}>{msg}</li>
                  ))}
                </ul>
              }
              style={{ fontSize: 12 }}
            />
          </Col>
        </Row>
      </Card>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={16}>
          <Card bodyStyle={{ padding: 12 }}>
            <ReactECharts option={waveformOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col span={8}>
          <Card bodyStyle={{ padding: 12 }}>
            <ReactECharts option={spectrumOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col span={14}>
          <Card bodyStyle={{ padding: 12 }}>
            <ReactECharts option={trendOption} style={{ height: 380 }} />
          </Card>
        </Col>
        <Col span={10}>
          <Card bodyStyle={{ padding: 12 }}>
            <ReactECharts option={dailyCardOption} style={{ height: 380 }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default CurrentSignalDiagnosis
