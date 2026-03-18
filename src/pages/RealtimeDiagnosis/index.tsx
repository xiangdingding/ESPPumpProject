import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Row, Col, Card, Select, Switch, Badge, Statistic, Progress, Alert, Descriptions, Space, Tag, Divider } from 'antd'
import {
  ThunderboltOutlined,
  DashboardOutlined,
  FireOutlined,
  AlertOutlined,
  FieldTimeOutlined,
  CompressOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { wellList, generateTimeSeriesData } from '../../mock/wellData'
import type { WellInfo } from '../../mock/wellData'

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  normal: 'success',
  warning: 'warning',
  alarm: 'error',
  offline: 'default',
}

const statusTextMap: Record<string, string> = {
  normal: '正常运行',
  warning: '预警',
  alarm: '报警',
  offline: '离线',
}

const pumpTypeTextMap: Record<string, string> = {
  ESP: '电潜泵',
  PCP: '螺杆泵',
}

const getDiagnosisInfo = (well: WellInfo) => {
  if (well.status === 'offline') return { type: 'info' as const, message: '设备离线', description: '该井当前处于离线状态，无法获取实时数据。' }
  if (well.temperature > 100) return { type: 'error' as const, message: '电机过热报警', description: `当前温度${well.temperature}°C，超过安全上限100°C，建议立即降频或停机检查。` }
  if (well.vibration > 5) return { type: 'error' as const, message: '振动异常报警', description: `当前振动值${well.vibration}mm/s，超过安全阈值5mm/s，可能存在机械故障。` }
  if (well.efficiency < 25) return { type: 'error' as const, message: '泵效严重偏低', description: `当前泵效${well.efficiency}%，远低于正常范围(30%-60%)，建议检泵。` }
  if (well.temperature > 90) return { type: 'warning' as const, message: '温度偏高预警', description: `当前温度${well.temperature}°C，接近上限值，请关注温度变化趋势。` }
  if (well.vibration > 3.5) return { type: 'warning' as const, message: '振动偏高预警', description: `当前振动值${well.vibration}mm/s，高于正常范围，建议排查原因。` }
  if (well.submergence < 250) return { type: 'warning' as const, message: '沉没度偏低', description: `当前沉没度${well.submergence}m，低于推荐值300m，存在供液不足风险。` }
  return { type: 'success' as const, message: '运行正常', description: '各项参数均在正常范围内，设备运行状态良好。' }
}

const RealtimeDiagnosis: React.FC = () => {
  const [selectedWellId, setSelectedWellId] = useState(wellList[0].id)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [timeSeriesData, setTimeSeriesData] = useState(() => generateTimeSeriesData(24))
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const selectedWell = useMemo(
    () => wellList.find(w => w.id === selectedWellId) || wellList[0],
    [selectedWellId]
  )

  const refreshData = useCallback(() => {
    setTimeSeriesData(generateTimeSeriesData(24))
  }, [])

  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(refreshData, 5000)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [autoRefresh, refreshData])

  const diagnosis = getDiagnosisInfo(selectedWell)

  const realtimeParams = [
    { label: '电流', value: selectedWell.current, unit: 'A', max: 50, color: '#1677ff', icon: <ThunderboltOutlined /> },
    { label: '电压', value: selectedWell.voltage, unit: 'V', max: 1500, color: '#722ed1', icon: <ThunderboltOutlined /> },
    { label: '频率', value: selectedWell.frequency, unit: 'Hz', max: 60, color: '#13c2c2', icon: <DashboardOutlined /> },
    { label: '温度', value: selectedWell.temperature, unit: '°C', max: 120, color: selectedWell.temperature > 95 ? '#ff4d4f' : '#faad14', icon: <FireOutlined /> },
    { label: '振动', value: selectedWell.vibration, unit: 'mm/s', max: 10, color: selectedWell.vibration > 5 ? '#ff4d4f' : '#52c41a', icon: <AlertOutlined /> },
    { label: '套压', value: selectedWell.casingPressure, unit: 'MPa', max: 8, color: '#1677ff', icon: <CompressOutlined /> },
    { label: '油压', value: selectedWell.tubingPressure, unit: 'MPa', max: 5, color: '#eb2f96', icon: <CompressOutlined /> },
    { label: '泵效', value: selectedWell.efficiency, unit: '%', max: 80, color: selectedWell.efficiency < 30 ? '#ff4d4f' : '#52c41a', icon: <FieldTimeOutlined /> },
  ]

  const trendOption = useMemo(() => {
    const currentData = timeSeriesData.map(d => ({ ...d, value: d.value * (selectedWell.current / 30) }))
    const tempData = timeSeriesData.map(d => ({
      ...d,
      value: selectedWell.temperature + (d.value - 30) * 0.8 + (Math.random() - 0.5) * 2,
    }))
    const vibData = timeSeriesData.map(d => ({
      ...d,
      value: selectedWell.vibration + (d.value - 30) * 0.05 + (Math.random() - 0.5) * 0.3,
    }))
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['电流(A)', '温度(°C)', '振动(mm/s)'], bottom: 0 },
      grid: { top: 30, right: 60, bottom: 40, left: 60 },
      xAxis: { type: 'category' as const, data: timeSeriesData.map(d => d.time), axisLabel: { fontSize: 10 } },
      yAxis: [
        { type: 'value' as const, name: '电流/温度', position: 'left' as const },
        { type: 'value' as const, name: '振动', position: 'right' as const, min: 0, max: 10 },
      ],
      series: [
        { name: '电流(A)', type: 'line', smooth: true, data: currentData.map(d => Math.round(d.value * 10) / 10), itemStyle: { color: '#1677ff' }, lineStyle: { width: 2 } },
        { name: '温度(°C)', type: 'line', smooth: true, data: tempData.map(d => Math.round(d.value * 10) / 10), itemStyle: { color: '#ff7a45' }, lineStyle: { width: 2 } },
        { name: '振动(mm/s)', type: 'line', smooth: true, data: vibData.map(d => Math.round(Math.max(0, d.value) * 100) / 100), yAxisIndex: 1, itemStyle: { color: '#52c41a' }, lineStyle: { width: 2 } },
      ],
    }
  }, [timeSeriesData, selectedWell])

  return (
    <div className="page-container">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card bodyStyle={{ padding: '12px 20px' }}>
            <Space size={24} wrap>
              <Space>
                <span style={{ fontWeight: 500 }}>选择井：</span>
                <Select
                  value={selectedWellId}
                  onChange={setSelectedWellId}
                  style={{ width: 200 }}
                  showSearch
                  optionFilterProp="label"
                  options={wellList.map(w => ({
                    value: w.id,
                    label: `${w.name} (${pumpTypeTextMap[w.pumpType || 'ESP']})`,
                  }))}
                />
              </Space>
              <Space>
                <span style={{ fontWeight: 500 }}>自动刷新：</span>
                <Switch checked={autoRefresh} onChange={setAutoRefresh} checkedChildren="开" unCheckedChildren="关" />
              </Space>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={6}>
          <Card title="井列表" bodyStyle={{ padding: 0, maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
            {wellList.map(w => (
              <div
                key={w.id}
                onClick={() => setSelectedWellId(w.id)}
                style={{
                  padding: '10px 16px',
                  cursor: 'pointer',
                  borderLeft: w.id === selectedWellId ? '3px solid #1677ff' : '3px solid transparent',
                  background: w.id === selectedWellId ? '#e6f4ff' : 'transparent',
                  transition: 'all 0.2s',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{w.name}</div>
                  <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                    {pumpTypeTextMap[w.pumpType || 'ESP']} · {w.oilField}
                  </div>
                </div>
                <Badge status={statusColorMap[w.status]} text={statusTextMap[w.status]} />
              </div>
            ))}
          </Card>
        </Col>

        <Col xs={24} md={18}>
          <Card title={`${selectedWell.name} - 基本信息`} style={{ marginBottom: 16 }}>
            <Descriptions size="small" column={{ xs: 2, sm: 3, md: 4, lg: 6 }}>
              <Descriptions.Item label="泵型">
                <Tag color={selectedWell.pumpType === 'ESP' ? 'blue' : 'green'}>
                  {pumpTypeTextMap[selectedWell.pumpType || 'ESP']}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="井深">{selectedWell.depth}m</Descriptions.Item>
              <Descriptions.Item label="泵挂深度">{selectedWell.pumpDepth}m</Descriptions.Item>
              <Descriptions.Item label="运行天数">{selectedWell.runDays}天</Descriptions.Item>
              <Descriptions.Item label="上次维护">{selectedWell.lastMaintenance}</Descriptions.Item>
              <Descriptions.Item label="动液面">{selectedWell.dynamicLevel}m</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card title="实时参数监控" style={{ marginBottom: 16 }}>
            <Row gutter={[12, 12]}>
              {realtimeParams.map((p, idx) => (
                <Col xs={12} sm={8} md={6} key={idx}>
                  <div style={{
                    padding: '12px', borderRadius: 8,
                    background: '#fafafa', border: '1px solid #f0f0f0',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ color: p.color, marginRight: 6, fontSize: 14 }}>{p.icon}</span>
                      <span style={{ fontSize: 12, color: '#8c8c8c' }}>{p.label}</span>
                    </div>
                    <Statistic
                      value={p.value}
                      suffix={p.unit}
                      valueStyle={{ fontSize: 20, fontWeight: 600, color: p.color }}
                    />
                    <Progress
                      percent={Math.round((p.value / p.max) * 100)}
                      size="small"
                      strokeColor={p.color}
                      showInfo={false}
                      style={{ marginTop: 4 }}
                    />
                  </div>
                </Col>
              ))}
            </Row>
          </Card>

          <Card title="实时趋势曲线（24小时）" style={{ marginBottom: 16 }} className="chart-card">
            <ReactECharts option={trendOption} style={{ height: 350 }} />
          </Card>

          <Card title="诊断结论">
            <Alert
              type={diagnosis.type}
              message={diagnosis.message}
              description={diagnosis.description}
              showIcon
            />
            <Divider style={{ margin: '12px 0' }} />
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="日产液量" value={selectedWell.dailyLiquid} suffix="t/d" valueStyle={{ fontSize: 16 }} />
              </Col>
              <Col span={8}>
                <Statistic title="日产油量" value={selectedWell.dailyOil} suffix="t/d" valueStyle={{ fontSize: 16 }} />
              </Col>
              <Col span={8}>
                <Statistic title="含水率" value={selectedWell.waterCut} suffix="%" valueStyle={{ fontSize: 16 }} />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default RealtimeDiagnosis
