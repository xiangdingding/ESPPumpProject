import React, { useState, useMemo, useEffect } from 'react'
import {
  Row, Col, Card, Badge, Statistic, Progress, Alert,
  Descriptions, Space, Tag, Divider, DatePicker, Input, Empty,
  Timeline,
} from 'antd'
import {
  ThunderboltOutlined, DashboardOutlined, FireOutlined,
  AlertOutlined, FieldTimeOutlined, CompressOutlined,
  SearchOutlined, FileTextOutlined,
  ArrowUpOutlined, ArrowDownOutlined, MinusOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { assignWellStatus, generateWellParams } from '../../mock/wellData'
import type { WellInfo } from '../../mock/wellData'
import type { DbWell } from '../../mock/wellDbData'
import { useOrgContext } from '../../contexts/OrgContext'
import { fetchWorkOrderByWell, type WorkOrderDTO, type WorkOrderLog } from '../../api/workOrderApi'

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  normal: 'success', warning: 'warning', alarm: 'error', offline: 'default',
}
const statusTextMap: Record<string, string> = {
  normal: '正常运行', warning: '预警', alarm: '报警', offline: '离线',
}

const diagnosisTypeMap: Record<string, string> = {
  C01: '气体影响', C02: '气锁', C03: '稠油及乳化', C04: '叶轮磨损',
  C05: '供液不足', C06: '运行正常', C07: '泵内堵塞', C08: '泵入口堵',
  C09: '泵反转', C10: '出砂', C11: '轴断', C12: '管柱漏失',
}
const descriptionMap: Record<string, string> = {
  C01: '气油比偏高，电流波动增大，泵效下降明显',
  C02: '泵腔充满气体，固定阀/游动阀无法启闭，产量归零',
  C03: '原油粘度大，电流偏高，排量下降',
  C04: '叶轮磨损严重，扬程下降，泵效降低',
  C05: '动液面下降快，电流降低，间歇出液',
  C06: '各项参数正常，设备运行稳定',
  C07: '泵内结垢或异物堵塞，电流升高，排量骤降',
  C08: '泵入口滤网堵塞，进液不畅，电流波动',
  C09: '电机反转，产量为零，电流异常',
  C10: '含砂量超标，泵磨损加剧，振动增大',
  C11: '传动轴断裂，电流骤降至空载，产量为零',
  C12: '油管或接箍漏失，套压升高，产量下降',
}
const diagnosisBasisMap: Record<string, string> = {
  C01: '电流波动增大，泵效下降，气油比偏高',
  C02: '电流骤降至空载值，产量归零，泵完全气锁',
  C03: '电流持续偏高，排量下降，含水率变化',
  C04: '扬程下降，泵效持续降低，电流略升',
  C05: '动液面持续下降，电流降低，产量递减',
  C06: '综合参数正常',
  C07: '电流突升，排量骤降，泵内压差异常',
  C08: '进液不畅，电流周期性波动，产量下降',
  C09: '电机反转信号，电流异常，产量为零',
  C10: '振动增大，含砂量超标，泵效下降',
  C11: '电流骤降至空载，扭矩消失，产量为零',
  C12: '套压升高，产量下降，油管压力异常',
}
const treatmentMap: Record<string, string> = {
  C01: '安装气体分离器，增大沉没度，降频',
  C02: '停机放气，安装高效分离器，加深泵挂',
  C03: '加热降粘，掺稀油，调整频率',
  C04: '检泵更换叶轮，优化运行参数',
  C05: '降频运行，间歇采油，补充地层能量',
  C06: '维持当前参数',
  C07: '停机反洗，化学清洗，检泵处理',
  C08: '清洗入口滤网，优化防砂措施',
  C09: '检查电缆接线，调整相序',
  C10: '加强防砂，降频运行，检泵清砂',
  C11: '起泵更换传动轴，检查机组',
  C12: '起管柱检查，更换漏失管段',
}

const woStatusLabel: Record<string, string> = {
  discovered: '已发现', analyzing: '分析中', solving: '处理中',
  executing: '执行中', verifying: '验证中', completed: '已完成',
  closed: '已关闭', cancelled: '已取消',
}
const woStatusColor: Record<string, string> = {
  discovered: '#faad14', analyzing: '#1677ff', solving: '#722ed1',
  executing: '#13c2c2', verifying: '#eb2f96', completed: '#52c41a',
  closed: '#8c8c8c', cancelled: '#d9d9d9',
}

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
    workConditionCode, status,
    depth: Number(dbWell.Well_Depth || 0),
    pumpDepth: Number(dbWell.Pump_Depth || 0),
    casingPressure: status === 'offline' ? 0 : Math.round((2 + Math.random() * 3) * 10) / 10,
    tubingPressure: status === 'offline' ? 0 : Math.round((1 + Math.random() * 2) * 10) / 10,
    dailyLiquid: params.dailyLiquid, dailyOil: params.dailyOil, waterCut: params.waterCut,
    frequency: params.frequency, current: params.current, voltage: params.voltage,
    power: params.power, temperature: params.temperature, vibration: params.vibration,
    efficiency: params.efficiency,
    runDays: status === 'offline' ? 0 : Math.round(50 + Math.random() * 800),
    lastMaintenance: '2025-06-15',
    submergence: params.submergence, gasOilRatio: params.gasOilRatio,
    dynamicLevel: params.dynamicLevel,
    pumpModel: String(dbWell.Pump_Model || 'TD500-200'),
    motorPower: Number(dbWell.Motor_Power || 45),
    stages: 200, cableSpec: '3×16mm²', separatorType: '旋转气体分离器', pumpType: 'ESP',
  }
}

function genPumpPressure(well: WellInfo) {
  if (well.status === 'offline') return { inlet: 0, outlet: 0 }
  const base = well.pumpDepth * 0.01
  const inlet = Math.round((base * 0.6 + Math.random() * 2) * 10) / 10
  const outlet = Math.round((inlet + 3 + Math.random() * 5) * 10) / 10
  return { inlet, outlet }
}

function genFaultProbDelta(well: WellInfo) {
  if (well.status === 'offline') return { delta3: 0, delta7: 0, current: 0 }
  const isAlarm = well.status === 'alarm'
  const isWarning = well.status === 'warning'
  const currentProb = isAlarm ? 65 + Math.random() * 30 : isWarning ? 25 + Math.random() * 30 : 2 + Math.random() * 10
  const delta3 = isAlarm ? Math.round((5 + Math.random() * 15) * 10) / 10
    : isWarning ? Math.round((2 + Math.random() * 8) * 10) / 10
    : Math.round((-3 + Math.random() * 4) * 10) / 10
  const delta7 = isAlarm ? Math.round((10 + Math.random() * 25) * 10) / 10
    : isWarning ? Math.round((5 + Math.random() * 12) * 10) / 10
    : Math.round((-5 + Math.random() * 6) * 10) / 10
  return { delta3, delta7, current: Math.round(currentProb * 10) / 10 }
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
  const { selectedOrg, filteredDbWells } = useOrgContext()

  const [selectedWellId, setSelectedWellId] = useState<string | null>(null)
  const [queryDate, setQueryDate] = useState<Dayjs>(dayjs())
  const [wellSearch, setWellSearch] = useState('')
  const [wellWO, setWellWO] = useState<WorkOrderDTO | null>(null)

  const convertedWellsMap = useMemo(() => {
    const map = new Map<string, WellInfo>()
    filteredDbWells.forEach(dbw => {
      const w = convertDbWellToAppWell(dbw)
      map.set(w.id, w)
    })
    return map
  }, [filteredDbWells])

  const statusOrder: Record<string, number> = { alarm: 0, warning: 1, normal: 2, offline: 3 }

  const filteredWells = useMemo(() => {
    let wells = filteredDbWells
    if (wellSearch.trim()) {
      const kw = wellSearch.trim().toLowerCase()
      wells = wells.filter(w =>
        (w.Well_Name || '').toLowerCase().includes(kw) ||
        (w.Well_Id || '').toLowerCase().includes(kw)
      )
    }
    return [...wells].sort((a, b) => {
      const sa = convertedWellsMap.get(String(a.Well_Id))?.status || 'offline'
      const sb = convertedWellsMap.get(String(b.Well_Id))?.status || 'offline'
      return (statusOrder[sa] ?? 9) - (statusOrder[sb] ?? 9)
    })
  }, [filteredDbWells, wellSearch, convertedWellsMap])

  const selectedWell = useMemo(() => {
    if (!selectedWellId) return null
    return convertedWellsMap.get(selectedWellId) || null
  }, [selectedWellId, convertedWellsMap])

  const pumpPressure = useMemo(() => selectedWell ? genPumpPressure(selectedWell) : { inlet: 0, outlet: 0 }, [selectedWell])
  const faultProb = useMemo(() => selectedWell ? genFaultProbDelta(selectedWell) : { delta3: 0, delta7: 0, current: 0 }, [selectedWell])

  useEffect(() => {
    setWellSearch('')
    if (filteredWells.length > 0) {
      setSelectedWellId(String(filteredWells[0].Well_Id))
    } else {
      setSelectedWellId(null)
    }
  }, [filteredDbWells])

  useEffect(() => {
    if (!selectedWellId) { setWellWO(null); return }
    let cancelled = false
    fetchWorkOrderByWell(selectedWellId)
      .then(wo => { if (!cancelled) setWellWO(wo) })
      .catch(() => { if (!cancelled) setWellWO(null) })
    return () => { cancelled = true }
  }, [selectedWellId])

  const diagnosis = selectedWell ? getDiagnosisInfo(selectedWell) : null
  const condCode = selectedWell?.workConditionCode || 'C06'

  const realtimeParams = selectedWell ? [
    { label: '电流', value: selectedWell.current, unit: 'A', max: 50, color: '#1677ff', icon: <ThunderboltOutlined /> },
    { label: '电压', value: selectedWell.voltage, unit: 'V', max: 1500, color: '#722ed1', icon: <ThunderboltOutlined /> },
    { label: '频率', value: selectedWell.frequency, unit: 'Hz', max: 60, color: '#13c2c2', icon: <DashboardOutlined /> },
    { label: '温度', value: selectedWell.temperature, unit: '°C', max: 120, color: selectedWell.temperature > 95 ? '#ff4d4f' : '#faad14', icon: <FireOutlined /> },
    { label: '振动', value: selectedWell.vibration, unit: 'mm/s', max: 10, color: selectedWell.vibration > 5 ? '#ff4d4f' : '#52c41a', icon: <AlertOutlined /> },
    { label: '套压', value: selectedWell.casingPressure, unit: 'MPa', max: 8, color: '#1677ff', icon: <CompressOutlined /> },
    { label: '油压', value: selectedWell.tubingPressure, unit: 'MPa', max: 5, color: '#eb2f96', icon: <CompressOutlined /> },
    { label: '泵效', value: selectedWell.efficiency, unit: '%', max: 80, color: selectedWell.efficiency < 30 ? '#ff4d4f' : '#52c41a', icon: <FieldTimeOutlined /> },
    { label: '泵入口压力', value: pumpPressure.inlet, unit: 'MPa', max: 30, color: '#2f54eb', icon: <CompressOutlined /> },
    { label: '泵出口压力', value: pumpPressure.outlet, unit: 'MPa', max: 40, color: '#531dab', icon: <CompressOutlined /> },
  ] : []

  const wellStatusSummary = useMemo(() => {
    const summary = { total: filteredWells.length, normal: 0, warning: 0, alarm: 0, offline: 0 }
    filteredWells.forEach(dbw => {
      const w = convertedWellsMap.get(String(dbw.Well_Id))
      if (w) {
        summary[w.status as keyof typeof summary] = (summary[w.status as keyof typeof summary] as number) + 1
      }
    })
    return summary
  }, [filteredWells, convertedWellsMap])

  const woLogs: WorkOrderLog[] = useMemo(() => {
    if (!wellWO) return []
    const logs = wellWO.logs
    if (!logs) return []
    if (typeof logs === 'string') {
      try { return JSON.parse(logs) } catch { return [] }
    }
    return logs as WorkOrderLog[]
  }, [wellWO])

  return (
    <div className="page-container">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card bodyStyle={{ padding: '12px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <Space size={16} wrap>
                <Space>
                  <span style={{ fontWeight: 500 }}>查询日期：</span>
                  <DatePicker
                    value={queryDate}
                    onChange={(date) => { if (date) setQueryDate(date) }}
                    allowClear={false}
                  />
                </Space>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} md={6}>
          <Card
            title={
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>
                  井列表
                  {selectedOrg && <Tag color="blue" style={{ marginLeft: 6, fontSize: 11 }}>{selectedOrg.name}</Tag>}
                </span>
                <Space size={4}>
                  <Badge status="success" text={<span style={{ fontSize: 11 }}>{wellStatusSummary.normal}</span>} />
                  <Badge status="warning" text={<span style={{ fontSize: 11 }}>{wellStatusSummary.warning}</span>} />
                  <Badge status="error" text={<span style={{ fontSize: 11 }}>{wellStatusSummary.alarm}</span>} />
                  <Badge status="default" text={<span style={{ fontSize: 11 }}>{wellStatusSummary.offline}</span>} />
                </Space>
              </div>
            }
            bodyStyle={{ padding: 0, maxHeight: 'calc(100vh - 240px)', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0' }}>
              <Input
                placeholder="搜索井号..."
                prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                value={wellSearch}
                onChange={e => setWellSearch(e.target.value)}
                allowClear
                size="small"
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredWells.length === 0 ? (
                <Empty description="暂无井数据" style={{ padding: '20px 0' }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
              ) : (
                filteredWells.map(dbw => {
                  const wId = String(dbw.Well_Id)
                  const appWell = convertedWellsMap.get(wId)
                  const isSelected = wId === selectedWellId
                  return (
                    <div
                      key={wId}
                      onClick={() => setSelectedWellId(wId)}
                      style={{
                        padding: '10px 16px',
                        cursor: 'pointer',
                        borderLeft: isSelected ? '3px solid #1677ff' : '3px solid transparent',
                        background: isSelected ? '#e6f4ff' : 'transparent',
                        transition: 'all 0.2s',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 500, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dbw.Well_Name || wId}
                        </div>
                        <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                          {appWell ? (diagnosisTypeMap[appWell.workConditionCode] || '运行正常') : '电潜泵'}
                        </div>
                      </div>
                      {appWell && (
                        <Badge
                          status={statusColorMap[appWell.status]}
                          text={statusTextMap[appWell.status]}
                        />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={18}>
          {!selectedWell ? (
            <Card style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="请在左侧井列表中选择井" />
            </Card>
          ) : (
            <>
              {/* 基本信息 */}
              <Card title={`${selectedWell.name} - 基本信息`} style={{ marginBottom: 16 }}>
                <Descriptions size="small" column={{ xs: 2, sm: 3, md: 4, lg: 6 }}>
                  <Descriptions.Item label="泵型"><Tag color="blue">电潜泵</Tag></Descriptions.Item>
                  <Descriptions.Item label="井深">{selectedWell.depth}m</Descriptions.Item>
                  <Descriptions.Item label="泵挂深度">{selectedWell.pumpDepth}m</Descriptions.Item>
                  <Descriptions.Item label="运行天数">{selectedWell.runDays}天</Descriptions.Item>
                  <Descriptions.Item label="上次维护">{selectedWell.lastMaintenance}</Descriptions.Item>
                  <Descriptions.Item label="动液面">{selectedWell.dynamicLevel}m</Descriptions.Item>
                </Descriptions>
              </Card>

              {/* 实时参数监控（含泵入口/出口压力） */}
              <Card title="实时参数监控" style={{ marginBottom: 16 }}>
                <Row gutter={[12, 12]}>
                  {realtimeParams.map((p, idx) => (
                    <Col xs={12} sm={8} md={6} lg={idx < 8 ? 6 : 12} key={idx}>
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

              {/* 故障概率分析 */}
              <Card title="故障概率分析" style={{ marginBottom: 16 }}>
                <Row gutter={16} align="middle">
                  <Col xs={24} sm={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>当前故障概率</div>
                      <Progress
                        type="dashboard"
                        percent={faultProb.current}
                        size={100}
                        strokeColor={faultProb.current > 60 ? '#ff4d4f' : faultProb.current > 30 ? '#faad14' : '#52c41a'}
                        format={p => <span style={{ fontSize: 18, fontWeight: 600 }}>{p}%</span>}
                      />
                    </div>
                  </Col>
                  <Col xs={12} sm={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>与前3天故障概率差</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: faultProb.delta3 > 0 ? '#ff4d4f' : faultProb.delta3 === 0 ? '#8c8c8c' : '#52c41a' }}>
                        {faultProb.delta3 > 0 ? <ArrowUpOutlined /> : faultProb.delta3 === 0 ? <MinusOutlined /> : <ArrowDownOutlined />}
                        {' '}{faultProb.delta3 > 0 ? '+' : ''}{faultProb.delta3}%
                      </div>
                    </div>
                  </Col>
                  <Col xs={12} sm={8}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 11, color: '#8c8c8c', marginBottom: 4 }}>与前7天故障概率差</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: faultProb.delta7 > 0 ? '#ff4d4f' : faultProb.delta7 === 0 ? '#8c8c8c' : '#52c41a' }}>
                        {faultProb.delta7 > 0 ? <ArrowUpOutlined /> : faultProb.delta7 === 0 ? <MinusOutlined /> : <ArrowDownOutlined />}
                        {' '}{faultProb.delta7 > 0 ? '+' : ''}{faultProb.delta7}%
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>

              {/* 诊断结论 + 诊断详情 */}
              <Card title="诊断结论" style={{ marginBottom: 16 }}>
                {diagnosis && (
                  <Alert
                    type={diagnosis.type}
                    message={diagnosis.message}
                    description={diagnosis.description}
                    showIcon
                  />
                )}
                <Divider style={{ margin: '12px 0' }} />
                <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} bordered>
                  <Descriptions.Item label="诊断类型">
                    <Tag color={selectedWell.status === 'alarm' ? 'red' : selectedWell.status === 'warning' ? 'orange' : 'green'}>
                      {diagnosisTypeMap[condCode] || '运行正常'}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="状态">
                    <Badge status={statusColorMap[selectedWell.status]} text={statusTextMap[selectedWell.status]} />
                  </Descriptions.Item>
                  <Descriptions.Item label="诊断日期">{queryDate.format('YYYY-MM-DD')}</Descriptions.Item>
                  <Descriptions.Item label="描述" span={3}>
                    {descriptionMap[condCode] || '各项参数正常，设备运行稳定'}
                  </Descriptions.Item>
                  <Descriptions.Item label="诊断依据" span={3}>
                    {diagnosisBasisMap[condCode] || '综合参数正常'}
                  </Descriptions.Item>
                  <Descriptions.Item label="处理措施" span={3}>
                    {treatmentMap[condCode] || '维持当前参数'}
                  </Descriptions.Item>
                  <Descriptions.Item label="备注" span={3}>
                    {selectedWell.status === 'alarm'
                      ? `${selectedWell.name} 存在严重异常，建议立即安排现场检查处理，避免设备损坏或停产。`
                      : selectedWell.status === 'warning'
                      ? `${selectedWell.name} 部分参数偏离正常范围，建议持续关注并制定预防性维护计划。`
                      : selectedWell.status === 'offline'
                      ? `${selectedWell.name} 当前离线，待恢复通讯后重新诊断。`
                      : `${selectedWell.name} 各项指标正常，无需特殊处理。`}
                  </Descriptions.Item>
                </Descriptions>
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

              {/* 工单记录 */}
              <Card
                title={
                  <Space>
                    <FileTextOutlined />
                    <span>工单记录</span>
                    {wellWO && <Tag color={woStatusColor[wellWO.status]}>{woStatusLabel[wellWO.status] || wellWO.status}</Tag>}
                  </Space>
                }
              >
                {!wellWO ? (
                  <Empty description="该井暂无工单记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                ) : (
                  <>
                    <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }} bordered style={{ marginBottom: 16 }}>
                      <Descriptions.Item label="工单编号">{wellWO.ticket_no || wellWO.id}</Descriptions.Item>
                      <Descriptions.Item label="严重程度">
                        <Tag color={wellWO.severity === 'alarm' ? 'red' : 'orange'}>{wellWO.severity === 'alarm' ? '严重' : '一般'}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="优先级">
                        <Tag color={wellWO.priority === 'alarm' ? 'red' : 'orange'}>{wellWO.priority === 'alarm' ? '紧急' : '普通'}</Tag>
                      </Descriptions.Item>
                      <Descriptions.Item label="诊断类型">{wellWO.diagnosis_type}</Descriptions.Item>
                      <Descriptions.Item label="发现人">{wellWO.discovered_by || '-'}</Descriptions.Item>
                      <Descriptions.Item label="发现时间">{wellWO.discovered_time || '-'}</Descriptions.Item>
                      {wellWO.assigned_team && <Descriptions.Item label="处理团队">{wellWO.assigned_team}</Descriptions.Item>}
                      {wellWO.analyzer && <Descriptions.Item label="分析人">{wellWO.analyzer}</Descriptions.Item>}
                      {wellWO.solution && <Descriptions.Item label="解决方案" span={3}>{wellWO.solution}</Descriptions.Item>}
                      <Descriptions.Item label="问题描述" span={3}>{wellWO.problem_desc || '-'}</Descriptions.Item>
                    </Descriptions>

                    {woLogs.length > 0 && (
                      <>
                        <div style={{ fontWeight: 500, marginBottom: 8, fontSize: 13 }}>操作记录</div>
                        <Timeline
                          items={woLogs.map(log => ({
                            color: woStatusColor[log.phase] || '#1677ff',
                            children: (
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontWeight: 500, fontSize: 13 }}>{log.action}</span>
                                  <span style={{ fontSize: 11, color: '#8c8c8c' }}>{log.created_at}</span>
                                </div>
                                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{log.detail}</div>
                                <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                                  操作人：{log.operator} · 阶段：{woStatusLabel[log.phase] || log.phase}
                                </div>
                              </div>
                            ),
                          }))}
                        />
                      </>
                    )}
                  </>
                )}
              </Card>
            </>
          )}
        </Col>
      </Row>
    </div>
  )
}

export default RealtimeDiagnosis
