import React, { useMemo, useState, useEffect } from 'react'
import { Row, Col, Card, Statistic, Tag, Modal, List, Badge, Divider, Spin } from 'antd'
import {
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  DisconnectOutlined,
  DashboardOutlined,
  ExperimentOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  AlertOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
  LoadingOutlined,
  RobotOutlined,
  BulbOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import { workConditionTypes, assignWellStatus, generateWellParams } from '../../mock/wellData'
import type { WorkConditionType, WellInfo } from '../../mock/wellData'
import { wellDbList, DbWell } from '../../mock/wellDbData'
import GISWellMap from '../../components/GISWellMap'

function convertDbWellToAppWell(dbWell: DbWell): WellInfo {
  const wellId = String(dbWell.Well_Id || '')
  const { workConditionCode, status } = assignWellStatus(wellId)
  const params = generateWellParams(wellId, status, workConditionCode)

  return {
    id: wellId,
    name: String(dbWell.Well_Name || ''),
    oilField: String(dbWell.Oil_Field || ''),
    block: String(dbWell.Block_Name || ''),
    lng: Number(dbWell.Longitude || 0),
    lat: Number(dbWell.Latitude || 0),
    workConditionCode,
    status,
    depth: Number(dbWell.Well_Depth || 0),
    pumpDepth: Number(dbWell.Pump_Depth || 0),
    casingPressure: status === 'offline' ? 0 : Math.round((2 + Math.random() * 3) * 10) / 10,
    tubingPressure: status === 'offline' ? 0 : Math.round((1 + Math.random() * 2) * 10) / 10,
    dailyLiquid: params.dailyLiquid,
    dailyOil: params.dailyOil,
    waterCut: params.waterCut,
    frequency: params.frequency,
    current: params.current,
    voltage: params.voltage,
    power: params.power,
    temperature: params.temperature,
    vibration: params.vibration,
    efficiency: params.efficiency,
    runDays: status === 'offline' ? 0 : Math.round(50 + Math.random() * 800),
    lastMaintenance: '2025-06-15',
    submergence: params.submergence,
    gasOilRatio: params.gasOilRatio,
    dynamicLevel: params.dynamicLevel,
    pumpModel: String(dbWell.Pump_Model || 'TD500-200'),
    motorPower: Number(dbWell.Motor_Power || 45),
    stages: 200,
    cableSpec: '3×16mm²',
    separatorType: '旋转气体分离器',
    pumpType: 'ESP',
  }
}

const severityColorMap: Record<string, string> = {
  info: '#52c41a',
  warning: '#faad14',
  danger: '#ff4d4f',
}

const severityLabelMap: Record<string, string> = {
  info: '正常',
  warning: '预警',
  danger: '严重',
}

const conditionIconColors: Record<string, string> = {
  C01: '#722ed1', C02: '#f5222d', C03: '#fa8c16', C04: '#eb2f96',
  C05: '#1677ff', C06: '#52c41a', C07: '#ff4d4f', C08: '#fa541c',
  C09: '#13c2c2', C10: '#d4b106', C11: '#cf1322', C12: '#2f54eb',
}

type StatusFilter = 'all' | 'normal' | 'warning' | 'alarm' | 'offline'

const Dashboard: React.FC = () => {
  const [conditionModalVisible, setConditionModalVisible] = useState(false)
  const [selectedCondition, setSelectedCondition] = useState<WorkConditionType | null>(null)
  const [wells, setWells] = useState<WellInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrg, setSelectedOrg] = useState<{ id: string; name: string; level: number } | null>(null)
  const [activeFilter, setActiveFilter] = useState<StatusFilter>('all')

  // 从数据库加载井数据
  useEffect(() => {
    try {
      setLoading(true)
      // 直接使用从数据库同步的mock数据
      if (wellDbList && wellDbList.length > 0) {
        const converted = wellDbList.map(convertDbWellToAppWell)
        setWells(converted)
      } else {
        // 使用旧版 mock 数据作为后备
        import('../../mock/wellData').then(mock => {
          setWells(mock.wellList as WellInfo[])
        })
      }
    } catch (err) {
      console.error('加载井数据失败:', err)
      // 发生异常时加载 mock 数据
      import('../../mock/wellData').then(mock => {
        setWells(mock.wellList as WellInfo[])
      })
    } finally {
      setLoading(false)
    }
  }, [])

  const handleConditionClick = (wc: WorkConditionType) => {
    setSelectedCondition(wc)
    setConditionModalVisible(true)
  }

  const stats = useMemo(() => {
    const total = wells.length
    const normal = wells.filter(w => w.status === 'normal').length
    const warning = wells.filter(w => w.status === 'warning').length
    const alarm = wells.filter(w => w.status === 'alarm').length
    const offline = wells.filter(w => w.status === 'offline').length
    const onlineWells = wells.filter(w => w.status !== 'offline')
    const avgEfficiency = onlineWells.length
      ? Math.round(onlineWells.reduce((s, w) => s + w.efficiency, 0) / onlineWells.length * 10) / 10
      : 0
    const totalLiquid = Math.round(onlineWells.reduce((s, w) => s + w.dailyLiquid, 0) * 10) / 10
    const totalOil = Math.round(onlineWells.reduce((s, w) => s + w.dailyOil, 0) * 10) / 10
    return { total, normal, warning, alarm, offline, avgEfficiency, totalLiquid, totalOil }
  }, [wells])

  const statCards: { title: string; value: number; suffix: string; color: string; icon: React.ReactNode; filterKey?: StatusFilter }[] = [
    { title: '总井数', value: stats.total, suffix: '口', color: '#1677ff', icon: <DashboardOutlined />, filterKey: 'all' },
    { title: '正常运行', value: stats.normal, suffix: '口', color: '#52c41a', icon: <CheckCircleOutlined />, filterKey: 'normal' },
    { title: '预警井数', value: stats.warning, suffix: '口', color: '#faad14', icon: <WarningOutlined />, filterKey: 'warning' },
    { title: '报警井数', value: stats.alarm, suffix: '口', color: '#ff4d4f', icon: <CloseCircleOutlined />, filterKey: 'alarm' },
    { title: '离线井数', value: stats.offline, suffix: '口', color: '#d9d9d9', icon: <DisconnectOutlined />, filterKey: 'offline' },
    { title: '平均泵效', value: stats.avgEfficiency, suffix: '%', color: '#722ed1', icon: <ThunderboltOutlined /> },
    { title: '总日产液量', value: stats.totalLiquid, suffix: 't/d', color: '#13c2c2', icon: <ExperimentOutlined /> },
    { title: '总日产油量', value: stats.totalOil, suffix: 't/d', color: '#eb2f96', icon: <BarChartOutlined /> },
  ]

  const filteredWells = useMemo(() => {
    if (activeFilter === 'all') return wells
    return wells.filter(w => w.status === activeFilter)
  }, [wells, activeFilter])

  const handleCardClick = (filterKey?: StatusFilter) => {
    if (!filterKey) return
    setActiveFilter(prev => prev === filterKey ? 'all' : filterKey)
  }

  const productionTrendOption = useMemo(() => {
    const onlineWells = filteredWells.filter(w => w.status !== 'offline')
    const baseLiquid = onlineWells.reduce((s, w) => s + w.dailyLiquid, 0)
    const baseOil = onlineWells.reduce((s, w) => s + w.dailyOil, 0)
    const dates: string[] = []
    const dailyLiquid: number[] = []
    const dailyOil: number[] = []
    for (let d = 30; d >= 0; d--) {
      const dt = new Date(); dt.setDate(dt.getDate() - d)
      dates.push(dt.toISOString().split('T')[0])
      const factor = 0.92 + Math.sin(d * 0.5) * 0.08
      dailyLiquid.push(Math.round(baseLiquid * factor * 10) / 10)
      dailyOil.push(Math.round(baseOil * factor * 10) / 10)
    }
    return {
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['总产液量(t)', '总产油量(t)'], bottom: 0 },
      grid: { top: 30, right: 20, bottom: 40, left: 60 },
      xAxis: { type: 'category' as const, data: dates, axisLabel: { rotate: 30, fontSize: 10 } },
      yAxis: [
        { type: 'value' as const, name: '产液(t)', position: 'left' as const },
        { type: 'value' as const, name: '产油(t)', position: 'right' as const },
      ],
      series: [
        { name: '总产液量(t)', type: 'line', smooth: true, data: dailyLiquid, itemStyle: { color: '#1677ff' }, areaStyle: { color: 'rgba(22,119,255,0.08)' } },
        { name: '总产油量(t)', type: 'line', smooth: true, data: dailyOil, yAxisIndex: 1, itemStyle: { color: '#52c41a' }, areaStyle: { color: 'rgba(82,196,26,0.08)' } },
      ],
    }
  }, [filteredWells])

  const efficiencyRankOption = useMemo(() => {
    const sorted = [...filteredWells]
      .filter(w => w.status !== 'offline')
      .sort((a, b) => a.efficiency - b.efficiency)
    const maxEff = sorted.length > 0 ? Math.ceil(Math.max(...sorted.map(w => w.efficiency)) / 10) * 10 : 70
    return {
      tooltip: { trigger: 'axis' as const, formatter: '{b}: {c}%' },
      grid: { top: 10, right: 40, bottom: 20, left: 100 },
      xAxis: { type: 'value' as const, max: maxEff, axisLabel: { formatter: '{value}%' } },
      yAxis: { type: 'category' as const, data: sorted.map(w => w.name), axisLabel: { fontSize: 11 } },
      series: [{
        type: 'bar',
        data: sorted.map(w => ({
          value: w.efficiency,
          itemStyle: {
            color: w.efficiency >= 45 ? '#52c41a' : w.efficiency >= 30 ? '#faad14' : '#ff4d4f',
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barWidth: 18,
        label: { show: true, position: 'right' as const, formatter: '{c}%', fontSize: 11 },
      }],
    }
  }, [filteredWells])

  const aiSummary = useMemo(() => {
    const alarmWells = wells.filter(w => w.status === 'alarm')
    const warningWells = wells.filter(w => w.status === 'warning')
    const lowEffWells = wells.filter(w => w.status !== 'offline' && w.efficiency < 30)
    const highEffWells = wells.filter(w => w.status !== 'offline' && w.efficiency > 50)

    const alarmTypes: Record<string, number> = {}
    alarmWells.forEach(w => {
      const name = workConditionTypes.find(wc => wc.code === w.workConditionCode)?.name || w.workConditionCode
      alarmTypes[name] = (alarmTypes[name] || 0) + 1
    })
    const topAlarmType = Object.entries(alarmTypes).sort((a, b) => b[1] - a[1])[0]

    const warningTypes: Record<string, number> = {}
    warningWells.forEach(w => {
      const name = workConditionTypes.find(wc => wc.code === w.workConditionCode)?.name || w.workConditionCode
      warningTypes[name] = (warningTypes[name] || 0) + 1
    })
    const topWarningType = Object.entries(warningTypes).sort((a, b) => b[1] - a[1])[0]

    const normalRate = stats.total > 0 ? Math.round(stats.normal / stats.total * 100) : 0
    const riskLevel = stats.alarm > stats.total * 0.25 ? 'high' : stats.alarm > stats.total * 0.1 ? 'medium' : 'low'
    const riskText = riskLevel === 'high' ? '较高' : riskLevel === 'medium' ? '中等' : '较低'
    const riskColor = riskLevel === 'high' ? '#ff4d4f' : riskLevel === 'medium' ? '#fa8c16' : '#52c41a'

    const insights: { icon: React.ReactNode; text: string; type: 'danger' | 'warning' | 'success' | 'info' }[] = []

    insights.push({
      icon: <SafetyCertificateOutlined />,
      text: `系统整体运行风险等级：${riskText}。正常运行率 ${normalRate}%（${stats.normal}/${stats.total}口），平均泵效 ${stats.avgEfficiency}%。`,
      type: riskLevel === 'high' ? 'danger' : riskLevel === 'medium' ? 'warning' : 'success',
    })

    if (stats.alarm > 0) {
      insights.push({
        icon: <CloseCircleOutlined />,
        text: `当前有 ${stats.alarm} 口井处于报警状态，需立即处理。${topAlarmType ? `主要报警类型为"${topAlarmType[0]}"（${topAlarmType[1]}口），` : ''}建议优先安排作业队现场处置。`,
        type: 'danger',
      })
    }

    if (stats.warning > 0) {
      insights.push({
        icon: <WarningOutlined />,
        text: `${stats.warning} 口井处于预警状态。${topWarningType ? `最突出的预警类型为"${topWarningType[0]}"（${topWarningType[1]}口），` : ''}建议密切监测并制定预防性维护计划。`,
        type: 'warning',
      })
    }

    if (lowEffWells.length > 0) {
      insights.push({
        icon: <ArrowDownOutlined />,
        text: `${lowEffWells.length} 口井泵效低于30%，存在能耗偏高风险。建议对低效井进行参数优化或检泵作业，预计可提升整体泵效 3~5 个百分点。`,
        type: 'warning',
      })
    }

    if (highEffWells.length > 0) {
      insights.push({
        icon: <ArrowUpOutlined />,
        text: `${highEffWells.length} 口井泵效超过50%，运行状态优良。可作为同区块其他井的参数优化参考标杆。`,
        type: 'success',
      })
    }

    if (stats.offline > 0) {
      insights.push({
        icon: <DisconnectOutlined />,
        text: `${stats.offline} 口井处于离线状态，建议排查通讯线路及地面控制系统，尽快恢复数据采集。`,
        type: 'info',
      })
    }

    insights.push({
      icon: <BulbOutlined />,
      text: `综合建议：日产液量 ${stats.totalLiquid.toLocaleString()} t/d，日产油量 ${stats.totalOil.toLocaleString()} t/d。建议重点关注报警井的工单处理进度，同时对预警井实施预防性降频或间歇抽油措施，避免工况恶化。`,
      type: 'info',
    })

    return { insights, riskColor, riskText }
  }, [wells, stats])

  // 加载状态
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} tip="正在加载井数据..." />
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* 第一排：统计卡片（可点击筛选） */}
      <Row gutter={[16, 16]}>
        {statCards.map((item, idx) => {
          const isActive = item.filterKey != null && activeFilter === item.filterKey
          const isClickable = item.filterKey != null
          return (
            <Col xs={12} sm={8} md={6} lg={3} key={idx}>
              <Card
                className="stat-card"
                bodyStyle={{ padding: '12px 16px' }}
                style={{
                  cursor: isClickable ? 'pointer' : 'default',
                  borderColor: isActive ? item.color : undefined,
                  boxShadow: isActive ? `0 0 0 2px ${item.color}30` : undefined,
                  transition: 'all 0.25s',
                  height: '100%',
                }}
                onClick={() => handleCardClick(item.filterKey)}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8,
                    background: isActive ? `${item.color}25` : `${item.color}15`,
                    display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: item.color, marginRight: 8, flexShrink: 0,
                  }}>
                    {item.icon}
                  </div>
                  <span style={{ fontSize: 12, color: isActive ? item.color : '#8c8c8c', fontWeight: isActive ? 600 : 400 }}>{item.title}</span>
                </div>
                <Statistic
                  value={item.value}
                  suffix={<span style={{ fontSize: 12 }}>{item.suffix}</span>}
                  valueStyle={{ fontSize: 20, fontWeight: 600, color: item.color, lineHeight: 1.2, whiteSpace: 'nowrap' }}
                />
              </Card>
            </Col>
          )
        })}
      </Row>

      {/* 第二排：GIS井位分布 + 工况类型统计 + 最近诊断记录 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <GISWellMap
            wells={filteredWells}
            height={400}
            middleSlot={
              <Card
                title={<span><AlertOutlined style={{ marginRight: 8 }} />工况类型统计（12类）</span>}
                className="chart-card"
                bodyStyle={{ padding: '12px 16px 16px' }}
              >
                <Row gutter={[12, 12]}>
                  {workConditionTypes.map(wc => {
                    const iconColor = conditionIconColors[wc.code]
                    const sevColor = severityColorMap[wc.severity]
                    return (
                      <Col xs={12} sm={8} md={6} lg={4} xl={4} key={wc.code}>
                        <Card
                          size="small"
                          hoverable
                          onClick={() => handleConditionClick(wc)}
                          style={{
                            borderLeft: `3px solid ${iconColor}`,
                            cursor: 'pointer',
                            height: '100%',
                          }}
                          bodyStyle={{ padding: '12px 14px' }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: '#333' }}>{wc.name}</span>
                            <Tag
                              color={sevColor}
                              style={{ marginRight: 0, fontSize: 11, lineHeight: '18px', padding: '0 6px' }}
                            >
                              {severityLabelMap[wc.severity]}
                            </Tag>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: 11, color: '#8c8c8c' }}>{wc.code}</span>
                            <span style={{ fontSize: 22, fontWeight: 700, color: iconColor }}>{wc.wellCount}</span>
                          </div>
                          <div style={{ fontSize: 11, color: '#aaa', textAlign: 'right' }}>口井</div>
                        </Card>
                      </Col>
                    )
                  })}
                </Row>
              </Card>
            }
          />
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="产液量趋势（近30天）" className="chart-card">
            <ReactECharts option={productionTrendOption} style={{ height: 380 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="各井效率排名" className="chart-card">
            <ReactECharts option={efficiencyRankOption} style={{ height: 380 }} />
          </Card>
        </Col>
      </Row>

      {/* AI 诊断摘要 */}
      <Card
        style={{ marginTop: 16, borderRadius: 8 }}
        bodyStyle={{ padding: '16px 20px' }}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <RobotOutlined style={{ color: '#fff', fontSize: 16 }} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 600 }}>AI 诊断摘要</span>
            <Tag color="purple" style={{ marginLeft: 4, fontSize: 11 }}>智能分析</Tag>
            <span style={{ fontSize: 11, color: '#999', marginLeft: 'auto' }}>
              更新时间：{new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {aiSummary.insights.map((item, idx) => {
            const bgMap = { danger: '#fff1f0', warning: '#fffbe6', success: '#f6ffed', info: '#e6f4ff' }
            const borderMap = { danger: '#ffccc7', warning: '#ffe58f', success: '#b7eb8f', info: '#91caff' }
            const colorMap = { danger: '#cf1322', warning: '#ad6800', success: '#389e0d', info: '#0958d9' }
            return (
              <div
                key={idx}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '10px 14px', borderRadius: 6,
                  background: bgMap[item.type], border: `1px solid ${borderMap[item.type]}`,
                }}
              >
                <span style={{ color: colorMap[item.type], fontSize: 16, marginTop: 1, flexShrink: 0 }}>{item.icon}</span>
                <span style={{ fontSize: 13, color: '#333', lineHeight: 1.7 }}>{item.text}</span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* 工况详情弹窗 */}
      <Modal
        open={conditionModalVisible}
        onCancel={() => setConditionModalVisible(false)}
        footer={null}
        width={680}
        title={
          selectedCondition ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 32, height: 32, borderRadius: 8,
                background: `${conditionIconColors[selectedCondition.code]}18`,
                color: conditionIconColors[selectedCondition.code],
                fontWeight: 700, fontSize: 13,
              }}>
                {selectedCondition.code}
              </span>
              <span style={{ fontSize: 18, fontWeight: 600 }}>{selectedCondition.name}</span>
              <Tag color={severityColorMap[selectedCondition.severity]}>
                {severityLabelMap[selectedCondition.severity]}
              </Tag>
              <Tag>{selectedCondition.wellCount} 口井</Tag>
            </div>
          ) : null
        }
      >
        {selectedCondition && (
          <div>
            {/* 工况机理 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
                fontSize: 15, fontWeight: 600, color: '#1677ff',
              }}>
                <DashboardOutlined /> 工况机理
              </div>
              <div style={{
                background: '#f6f8fa', borderRadius: 8, padding: '14px 16px',
                fontSize: 13, lineHeight: 1.8, color: '#444',
                borderLeft: `3px solid ${conditionIconColors[selectedCondition.code]}`,
              }}>
                {selectedCondition.mechanism}
              </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* 诊断依据 */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
                fontSize: 15, fontWeight: 600, color: '#fa8c16',
              }}>
                <SafetyCertificateOutlined /> 诊断依据
              </div>
              <List
                size="small"
                dataSource={selectedCondition.features}
                renderItem={(item, idx) => (
                  <List.Item style={{ padding: '6px 0', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <Badge
                        count={idx + 1}
                        style={{
                          backgroundColor: '#fa8c16', fontSize: 11,
                          minWidth: 20, height: 20, lineHeight: '20px',
                        }}
                      />
                      <span style={{ fontSize: 13, color: '#555', lineHeight: '20px' }}>{item}</span>
                    </div>
                  </List.Item>
                )}
              />
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* 处置措施 */}
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10,
                fontSize: 15, fontWeight: 600, color: '#52c41a',
              }}>
                <ToolOutlined /> 处置措施
              </div>
              <List
                size="small"
                dataSource={selectedCondition.suggestions}
                renderItem={(item) => (
                  <List.Item style={{ padding: '6px 0', border: 'none' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <span style={{ color: '#52c41a', fontWeight: 700, fontSize: 14 }}>→</span>
                      <span style={{ fontSize: 13, color: '#555', lineHeight: '20px' }}>{item}</span>
                    </div>
                  </List.Item>
                )}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Dashboard
