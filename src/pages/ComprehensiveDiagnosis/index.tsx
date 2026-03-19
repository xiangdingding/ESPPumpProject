import React, { useState, useMemo, useEffect } from 'react'
import { Row, Col, Card, Select, Tag, Space, DatePicker, Table, Badge, Input, Empty } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { assignWellStatus, generateWellParams } from '../../mock/wellData'
import type { WellInfo } from '../../mock/wellData'
import type { DbWell } from '../../mock/wellDbData'
import { useOrgContext } from '../../contexts/OrgContext'

const { RangePicker } = DatePicker

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

function convertDbWell(dbWell: DbWell): WellInfo {
  const wellId = String(dbWell.Well_Id || '')
  const { workConditionCode, status } = assignWellStatus(wellId)
  const params = generateWellParams(wellId, status, workConditionCode)
  return {
    id: wellId, name: String(dbWell.Well_Name || ''), oilField: String(dbWell.Oil_Field || ''),
    block: String(dbWell.Block_Name || ''), lng: 0, lat: 0, workConditionCode, status,
    depth: Number(dbWell.Well_Depth || 0), pumpDepth: Number(dbWell.Pump_Depth || 0),
    casingPressure: status === 'offline' ? 0 : Math.round((2 + Math.random() * 3) * 10) / 10,
    tubingPressure: status === 'offline' ? 0 : Math.round((1 + Math.random() * 2) * 10) / 10,
    dailyLiquid: params.dailyLiquid, dailyOil: params.dailyOil, waterCut: params.waterCut,
    frequency: params.frequency, current: params.current, voltage: params.voltage,
    power: params.power, temperature: params.temperature, vibration: params.vibration,
    efficiency: params.efficiency,
    runDays: status === 'offline' ? 0 : Math.round(50 + Math.random() * 800),
    lastMaintenance: '2025-06-15', submergence: params.submergence,
    gasOilRatio: params.gasOilRatio, dynamicLevel: params.dynamicLevel,
    pumpModel: String(dbWell.Pump_Model || 'TD500-200'), motorPower: Number(dbWell.Motor_Power || 45),
    stages: 200, cableSpec: '3×16mm²', separatorType: '旋转气体分离器', pumpType: 'ESP',
  }
}

function genTimeSeries(start: Dayjs, end: Dayjs, baseVal: number, noise: number, trend = 0) {
  const days = end.diff(start, 'day') + 1
  const pts: { date: string; value: number }[] = []
  for (let i = 0; i < days; i++) {
    const d = start.add(i, 'day')
    pts.push({
      date: d.format('YYYY-MM-DD'),
      value: Math.round((baseVal + trend * i + (Math.random() - 0.5) * noise * 2) * 100) / 100,
    })
  }
  return pts
}

const espDiagnosisItems = [
  { id: 1, faultType: '停机', paramDesc: '' },
  { id: 2, faultType: '三相不平', paramDesc: '' },
  { id: 3, faultType: '供电缺相', paramDesc: '' },
  { id: 4, faultType: '电流过载', paramDesc: '' },
]

function genEspDiagForWell(well: WellInfo) {
  const items = espDiagnosisItems.map(item => ({ ...item }))
  if (well.status === 'offline') {
    items[0].paramDesc = '设备已停机，无供电信号'
  } else if (well.status === 'alarm') {
    items[0].paramDesc = '运行中'
    const faults = [
      { idx: 1, desc: `三相电流不平衡度 ${(8 + Math.random() * 12).toFixed(1)}%，超过阈值5%` },
      { idx: 2, desc: `检测到缺相信号，B相电压偏低 ${(well.voltage * 0.6).toFixed(0)}V` },
      { idx: 3, desc: `运行电流 ${well.current}A，额定电流 ${(well.current * 0.75).toFixed(1)}A，过载 ${((well.current / (well.current * 0.75) - 1) * 100).toFixed(0)}%` },
    ]
    const pick = faults[Math.floor(Math.random() * faults.length)]
    items[pick.idx].paramDesc = pick.desc
  } else if (well.status === 'warning') {
    items[0].paramDesc = '运行中'
    items[3].paramDesc = `运行电流 ${well.current}A，接近额定值`
  } else {
    items[0].paramDesc = '运行中'
  }
  return items
}

const prodDiagnosisItems = [
  { id: 1, condType: '正常', prob: 80, trend: 0 },
  { id: 2, condType: '泵反转', prob: 30, trend: 0 },
  { id: 3, condType: '供液不足', prob: 30, trend: 0 },
  { id: 4, condType: '气体影响', prob: 20, trend: 0 },
  { id: 5, condType: '管柱漏失', prob: 10, trend: 0 },
  { id: 6, condType: '泵入口堵', prob: 10, trend: 0 },
  { id: 7, condType: '出砂', prob: 8, trend: 0 },
  { id: 8, condType: '轴断', prob: 0, trend: 0 },
  { id: 9, condType: '叶轮磨损', prob: 0, trend: 0 },
]

function genProdDiagForWell(well: WellInfo) {
  const items = prodDiagnosisItems.map(item => ({ ...item }))
  if (well.status === 'alarm') {
    items[0].prob = Math.round(5 + Math.random() * 10)
    items[0].trend = -Math.round(5 + Math.random() * 15)
    const codeMap: Record<string, number> = { C02: 1, C05: 2, C08: 4, C09: 5, C10: 6, C12: 3 }
    const idx = codeMap[well.workConditionCode] ?? Math.floor(Math.random() * 7) + 1
    items[idx].prob = Math.round(60 + Math.random() * 30)
    items[idx].trend = Math.round(10 + Math.random() * 20)
  } else if (well.status === 'warning') {
    items[0].prob = Math.round(45 + Math.random() * 20)
    items[0].trend = -Math.round(Math.random() * 8)
    const codeMap: Record<string, number> = { C01: 2, C03: 6, C04: 4, C05: 2 }
    const idx = codeMap[well.workConditionCode] ?? Math.floor(Math.random() * 5) + 1
    items[idx].prob = Math.round(20 + Math.random() * 25)
    items[idx].trend = Math.round(5 + Math.random() * 10)
  } else if (well.status === 'normal') {
    items[0].prob = Math.round(80 + Math.random() * 15)
    items[0].trend = 0
    items[1].prob = Math.round(Math.random() * 5)
    items[2].prob = Math.round(Math.random() * 5)
  } else {
    items.forEach(it => { it.prob = 0; it.trend = 0 })
  }
  return items
}

const ComprehensiveDiagnosis: React.FC = () => {
  const { selectedOrg, filteredDbWells } = useOrgContext()
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null)
  const [wellSearch, setWellSearch] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()])
  const [displayMode, setDisplayMode] = useState<string>('day')

  const convertedMap = useMemo(() => {
    const map = new Map<string, WellInfo>()
    filteredDbWells.forEach(dbw => { const w = convertDbWell(dbw); map.set(w.id, w) })
    return map
  }, [filteredDbWells])

  const statusOrder: Record<string, number> = { alarm: 0, warning: 1, normal: 2, offline: 3 }
  const sortedWells = useMemo(() => {
    let wells = filteredDbWells
    if (wellSearch.trim()) {
      const kw = wellSearch.trim().toLowerCase()
      wells = wells.filter(w => (w.Well_Name || '').toLowerCase().includes(kw) || (w.Well_Id || '').toLowerCase().includes(kw))
    }
    return [...wells].sort((a, b) => {
      const sa = convertedMap.get(String(a.Well_Id))?.status || 'offline'
      const sb = convertedMap.get(String(b.Well_Id))?.status || 'offline'
      return (statusOrder[sa] ?? 9) - (statusOrder[sb] ?? 9)
    })
  }, [filteredDbWells, wellSearch, convertedMap])

  const selectedWell = useMemo(() => selectedWellId ? convertedMap.get(selectedWellId) || null : null, [selectedWellId, convertedMap])

  useEffect(() => {
    setWellSearch('')
    if (sortedWells.length > 0) setSelectedWellId(String(sortedWells[0].Well_Id))
    else setSelectedWellId(null)
  }, [filteredDbWells])

  const espChartOption = useMemo(() => {
    if (!selectedWell) return {}
    const [start, end] = dateRange
    const pInlet = genTimeSeries(start, end, selectedWell.pumpDepth * 0.006 + 2, 1.5)
    const pOutlet = genTimeSeries(start, end, selectedWell.pumpDepth * 0.006 + 8, 2)
    const tInlet = genTimeSeries(start, end, selectedWell.temperature, 5, selectedWell.status === 'alarm' ? 0.3 : 0)
    const curr = genTimeSeries(start, end, selectedWell.current, 3, selectedWell.status === 'alarm' ? 0.15 : 0)
    const volt = genTimeSeries(start, end, selectedWell.voltage, 30)
    const freq = genTimeSeries(start, end, selectedWell.frequency, 2)
    const dates = pInlet.map(p => p.date)
    return {
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'cross' as const } },
      legend: { data: ['泵入口压力(MPa)', '泵出口压力(MPa)', '泵入口温度(℃)', '泵电流(A)', '泵电压(V)', '频率率(Hz)'], bottom: 0, textStyle: { fontSize: 11 } },
      grid: { top: 30, right: 80, bottom: 50, left: 60 },
      xAxis: { type: 'category' as const, data: dates, axisLabel: { fontSize: 10, rotate: 30 } },
      yAxis: [
        { type: 'value' as const, name: '压力/温度', position: 'left' as const },
        { type: 'value' as const, name: '电流/电压/频率', position: 'right' as const },
      ],
      dataZoom: [{ type: 'inside' as const }, { type: 'slider' as const, height: 16, bottom: 30 }],
      series: [
        { name: '泵入口压力(MPa)', type: 'line', data: pInlet.map(p => p.value), smooth: true, lineStyle: { color: '#ff4d4f', width: 2 }, itemStyle: { color: '#ff4d4f' }, symbol: 'circle', symbolSize: 4 },
        { name: '泵出口压力(MPa)', type: 'line', data: pOutlet.map(p => p.value), smooth: true, lineStyle: { color: '#333', width: 2 }, itemStyle: { color: '#333' }, symbol: 'diamond', symbolSize: 4 },
        { name: '泵入口温度(℃)', type: 'line', data: tInlet.map(p => p.value), smooth: true, lineStyle: { color: '#1677ff', width: 2 }, itemStyle: { color: '#1677ff' }, symbol: 'triangle', symbolSize: 4 },
        { name: '泵电流(A)', type: 'line', yAxisIndex: 1, data: curr.map(p => p.value), smooth: true, lineStyle: { color: '#52c41a', width: 2 }, itemStyle: { color: '#52c41a' }, symbol: 'rect', symbolSize: 4 },
        { name: '泵电压(V)', type: 'line', yAxisIndex: 1, data: volt.map(p => p.value), smooth: true, lineStyle: { color: '#722ed1', width: 2 }, itemStyle: { color: '#722ed1' }, symbol: 'roundRect', symbolSize: 4 },
        { name: '频率率(Hz)', type: 'line', yAxisIndex: 1, data: freq.map(p => p.value), smooth: true, lineStyle: { color: '#eb2f96', width: 2 }, itemStyle: { color: '#eb2f96' }, symbol: 'pin', symbolSize: 6 },
      ],
    }
  }, [selectedWell, dateRange])

  const prodChartOption = useMemo(() => {
    if (!selectedWell) return {}
    const [start, end] = dateRange
    const liq = genTimeSeries(start, end, selectedWell.dailyLiquid, 8, selectedWell.status === 'alarm' ? -0.3 : 0)
    const oil = genTimeSeries(start, end, selectedWell.dailyOil, 3)
    const oilP = genTimeSeries(start, end, selectedWell.tubingPressure, 0.3)
    const casP = genTimeSeries(start, end, selectedWell.casingPressure, 0.4)
    const water = genTimeSeries(start, end, selectedWell.dailyLiquid * selectedWell.waterCut / 100, 5)
    const gas = genTimeSeries(start, end, selectedWell.dailyLiquid * selectedWell.gasOilRatio / 1000, 0.8)
    const wellTemp = genTimeSeries(start, end, selectedWell.temperature * 0.7, 3)
    const dates = liq.map(p => p.date)
    return {
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'cross' as const } },
      legend: { data: ['日产液量(m³)', '日产油量(m³)', '油压(MPa)', '套压(MPa)', '日产水量(m³)', '日产气量(m³)', '井口温度(℃)'], bottom: 0, textStyle: { fontSize: 11 } },
      grid: { top: 30, right: 80, bottom: 50, left: 60 },
      xAxis: { type: 'category' as const, data: dates, axisLabel: { fontSize: 10, rotate: 30 } },
      yAxis: [
        { type: 'value' as const, name: '产量', position: 'left' as const },
        { type: 'value' as const, name: '压力/温度', position: 'right' as const },
      ],
      dataZoom: [{ type: 'inside' as const }, { type: 'slider' as const, height: 16, bottom: 30 }],
      series: [
        { name: '日产液量(m³)', type: 'line', data: liq.map(p => p.value), smooth: true, lineStyle: { color: '#1677ff', width: 2 }, itemStyle: { color: '#1677ff' }, areaStyle: { color: 'rgba(22,119,255,0.08)' } },
        { name: '日产油量(m³)', type: 'line', data: oil.map(p => p.value), smooth: true, lineStyle: { color: '#52c41a', width: 2 }, itemStyle: { color: '#52c41a' } },
        { name: '油压(MPa)', type: 'line', yAxisIndex: 1, data: oilP.map(p => p.value), smooth: true, lineStyle: { color: '#faad14', width: 2 }, itemStyle: { color: '#faad14' } },
        { name: '套压(MPa)', type: 'line', yAxisIndex: 1, data: casP.map(p => p.value), smooth: true, lineStyle: { color: '#ff4d4f', width: 2 }, itemStyle: { color: '#ff4d4f' } },
        { name: '日产水量(m³)', type: 'line', data: water.map(p => p.value), smooth: true, lineStyle: { color: '#13c2c2', width: 2, type: 'dashed' as const }, itemStyle: { color: '#13c2c2' } },
        { name: '日产气量(m³)', type: 'line', data: gas.map(p => p.value), smooth: true, lineStyle: { color: '#722ed1', width: 2, type: 'dashed' as const }, itemStyle: { color: '#722ed1' } },
        { name: '井口温度(℃)', type: 'line', yAxisIndex: 1, data: wellTemp.map(p => p.value), smooth: true, lineStyle: { color: '#eb2f96', width: 2 }, itemStyle: { color: '#eb2f96' } },
      ],
    }
  }, [selectedWell, dateRange])

  const espDiag = useMemo(() => selectedWell ? genEspDiagForWell(selectedWell) : [], [selectedWell])
  const prodDiag = useMemo(() => selectedWell ? genProdDiagForWell(selectedWell) : [], [selectedWell])

  const diagColumns = [
    { title: '序号', dataIndex: 'id', key: 'id', width: 50, align: 'center' as const },
    { title: '故障类型', dataIndex: 'faultType', key: 'faultType', width: 90,
      render: (v: string, r: any) => <span style={{ color: r.paramDesc && r.paramDesc !== '运行中' && r.id !== 1 ? '#722ed1' : '#333' }}>{v}</span>,
    },
    { title: '参数说明', dataIndex: 'paramDesc', key: 'paramDesc', ellipsis: true,
      render: (v: string) => v ? <span style={{ color: v === '运行中' ? '#333' : '#ff4d4f', fontSize: 12 }}>{v}</span> : '-',
    },
  ]

  const prodDiagColumns = [
    { title: '序号', dataIndex: 'id', key: 'id', width: 46, align: 'center' as const },
    { title: '工况类型', dataIndex: 'condType', key: 'condType', width: 90,
      render: (v: string, r: any) => <span style={{ fontWeight: r.prob > 50 ? 600 : 400, color: r.prob > 50 ? '#ff4d4f' : r.prob > 20 ? '#faad14' : '#333' }}>{v}</span>,
    },
    { title: '概率', dataIndex: 'prob', key: 'prob', width: 65, align: 'center' as const,
      render: (v: number) => <span style={{ fontWeight: v > 50 ? 600 : 400, color: v > 50 ? '#ff4d4f' : v > 20 ? '#faad14' : '#333' }}>{v}%</span>,
    },
    { title: '变化趋势', dataIndex: 'trend', key: 'trend', width: 75, align: 'center' as const,
      render: (v: number) => <span style={{ color: v > 0 ? '#ff4d4f' : v < 0 ? '#52c41a' : '#333' }}>{v > 0 ? `+${v}` : v}%</span>,
    },
  ]

  const diagTime = dayjs().format('YYYY-MM-DD HH:mm:ss')

  return (
    <div className="page-container" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <Card bodyStyle={{ padding: '8px 16px' }} style={{ marginBottom: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Space size={12} wrap>
            <Space>
              <span style={{ fontWeight: 500, fontSize: 13 }}>起始时间：</span>
              <RangePicker
                value={dateRange}
                onChange={(dates) => { if (dates?.[0] && dates?.[1]) setDateRange([dates[0], dates[1]]) }}
                style={{ width: 260 }}
                size="small"
                allowClear={false}
              />
            </Space>
            <Space>
              <span style={{ fontWeight: 500, fontSize: 13 }}>数据类型：</span>
              <Select value={displayMode} onChange={setDisplayMode} size="small" style={{ width: 100 }}
                options={[{ value: 'day', label: '日数据' }, { value: 'hour', label: '小时数据' }, { value: 'realtime', label: '实时数据' }]}
              />
            </Space>
          </Space>
        </div>
      </Card>

      {/* Main content: 3-column layout */}
      <div style={{ flex: 1, display: 'flex', gap: 8, overflow: 'hidden', minHeight: 0 }}>
        {/* Left: Well tree list */}
        <Card
          bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
          style={{ width: 200, flexShrink: 0, overflow: 'hidden' }}
          size="small"
          title={
            <span style={{ fontSize: 12 }}>
              井列表 {selectedOrg && <Tag color="blue" style={{ fontSize: 10 }}>{selectedOrg.name}</Tag>}
            </span>
          }
        >
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0' }}>
            <Input
              placeholder="搜索井号..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={wellSearch}
              onChange={e => setWellSearch(e.target.value)}
              allowClear size="small" style={{ fontSize: 12 }}
            />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {sortedWells.length === 0 ? (
              <Empty description="暂无数据" style={{ padding: 16 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              sortedWells.map(dbw => {
                const wId = String(dbw.Well_Id)
                const appW = convertedMap.get(wId)
                const isSel = wId === selectedWellId
                return (
                  <div
                    key={wId}
                    onClick={() => setSelectedWellId(wId)}
                    style={{
                      padding: '10px 16px',
                      cursor: 'pointer',
                      borderLeft: isSel ? '3px solid #1677ff' : '3px solid transparent',
                      background: isSel ? '#e6f4ff' : 'transparent',
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
                        {appW ? (diagnosisTypeMap[appW.workConditionCode] || '运行正常') : '电潜泵'}
                      </div>
                    </div>
                    {appW && (
                      <Badge
                        status={statusColorMap[appW.status]}
                        text={statusTextMap[appW.status]}
                      />
                    )}
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Center: Charts */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto', minWidth: 0 }}>
          {!selectedWell ? (
            <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="请选择井" />
            </Card>
          ) : (
            <>
              <Card
                size="small"
                title={<span style={{ fontSize: 13 }}>{selectedWell.name} 多参数变化综合监测</span>}
                bodyStyle={{ padding: '4px 8px' }}
                style={{ flexShrink: 0 }}
              >
                <ReactECharts option={espChartOption} style={{ height: 280 }} />
              </Card>
              <Card
                size="small"
                title={<span style={{ fontSize: 13 }}>{selectedWell.name} 生产参数变化监测</span>}
                bodyStyle={{ padding: '4px 8px' }}
                style={{ flexShrink: 0 }}
              >
                <ReactECharts option={prodChartOption} style={{ height: 280 }} />
              </Card>
            </>
          )}
        </div>

        {/* Right: Diagnosis tables */}
        <div style={{ width: 320, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto' }}>
          <Card
            size="small"
            title={<span style={{ fontSize: 12 }}>外部供电诊断结果</span>}
            extra={<span style={{ fontSize: 10, color: '#999' }}>诊断时间: {diagTime}</span>}
            bodyStyle={{ padding: 0 }}
            style={{ marginBottom: 8 }}
          >
            <Table
              className="esp-diag-table"
              columns={diagColumns}
              dataSource={espDiag}
              rowKey="id"
              size="small"
              pagination={false}
              rowClassName={(r: any) => r.paramDesc && r.paramDesc !== '运行中' && r.id !== 1 ? 'diag-row-alarm' : ''}
            />
          </Card>
          <Card
            size="small"
            title={<span style={{ fontSize: 12 }}>生产运行诊断结果</span>}
            extra={<span style={{ fontSize: 10, color: '#999' }}>诊断时间: {diagTime}</span>}
            bodyStyle={{ padding: 0 }}
          >
            <Table
              className="prod-diag-table"
              columns={prodDiagColumns}
              dataSource={prodDiag}
              rowKey="id"
              size="small"
              pagination={false}
              rowClassName={(r: any) => r.prob > 50 ? 'diag-row-alarm' : r.prob > 20 ? 'diag-row-warn' : ''}
            />
          </Card>
        </div>
      </div>

      <style>{`
        .diag-row-alarm td { background: #fff1f0 !important; }
        .diag-row-warn td { background: #fffbe6 !important; }
        .esp-diag-table .ant-table-thead > tr > th {
          background: #e6f4ff !important;
          color: #1677ff;
          font-weight: 600;
          font-size: 12px;
        }
        .prod-diag-table .ant-table-thead > tr > th {
          background: #e6f4ff !important;
          color: #1677ff;
          font-weight: 600;
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}

export default ComprehensiveDiagnosis
