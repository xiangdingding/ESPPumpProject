import React, { useState, useMemo, useEffect } from 'react'
import { Card, Tag, Badge, DatePicker, Button, Space, Table, Input, Empty, Collapse, Descriptions } from 'antd'
import { SearchOutlined, RobotOutlined } from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { assignWellStatus, generateWellParams } from '../../mock/wellData'
import type { WellInfo } from '../../mock/wellData'
import type { DbWell } from '../../mock/wellDbData'
import { useOrgContext } from '../../contexts/OrgContext'

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

function seededRand(seed: number) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

const zoneNames = ['I.工况合理区', 'II.排量异常区', 'III.沉没度偏大区', 'IV.潜力区', 'V.供液不足区', 'VI.扬程偏大区']
const zoneColors = ['#52c41a', '#ff4d4f', '#1677ff', '#faad14', '#722ed1', '#13c2c2']

function getZone(eff: number, pInlet: number): number {
  if (eff >= 0.4 && eff <= 2.0 && pInlet >= 2 && pInlet <= 6.3) return 0
  if (eff < 0.4 && pInlet > 6.3) return 1
  if (eff >= 0.4 && eff <= 2.0 && pInlet > 6.3) return 2
  if (eff > 2.0 && pInlet > 6.3) return 3
  if (eff < 0.4 && pInlet <= 2) return 4
  if (eff > 2.0 && pInlet <= 6.3) return 5
  if (eff < 0.4 && pInlet > 2 && pInlet <= 6.3) return 1
  return 5
}

function genPumpInletPressure(well: WellInfo): number {
  const base = well.pumpDepth > 0 ? well.pumpDepth * 0.006 + 1 : 3
  const seed = well.id.charCodeAt(0) + well.id.charCodeAt(well.id.length - 1)
  const r = seededRand(seed)
  if (well.status === 'alarm') return Math.round((base * 0.3 + r * 2) * 100) / 100
  if (well.status === 'warning') return Math.round((base * 0.6 + r * 3) * 100) / 100
  return Math.round((base + r * 4) * 100) / 100
}

function genDisplacementEff(well: WellInfo): number {
  const seed = well.id.charCodeAt(0) * 7 + well.id.charCodeAt(well.id.length - 1)
  const r = seededRand(seed)
  if (well.status === 'alarm') return Math.round((0.1 + r * 0.4) * 100) / 100
  if (well.status === 'warning') return Math.round((0.3 + r * 0.6) * 100) / 100
  return Math.round((0.5 + r * 0.8) * 100) / 100
}

function genProductionTrend(well: WellInfo, startDate: Dayjs, endDate: Dayjs) {
  const days = endDate.diff(startDate, 'day') + 1
  const baseLiq = well.dailyLiquid
  const baseBhp = well.pumpDepth > 0 ? well.pumpDepth * 0.01 + 5 : 12
  const seed0 = well.id.charCodeAt(0) + well.id.charCodeAt(well.id.length - 1)
  const bhpBase = baseBhp + seededRand(seed0) * 6
  return Array.from({ length: days }, (_, i) => {
    const d = startDate.add(i, 'day')
    const seed = d.unix() + well.id.charCodeAt(0)
    const r = seededRand(seed)
    const drift = well.status === 'alarm' ? -i * 0.3 : 0
    return {
      date: d.format('MM-DD'),
      liquid: Math.max(0, Math.round((baseLiq + (r - 0.5) * baseLiq * 0.2 + drift) * 10) / 10),
      bhp: Math.max(0, Math.round((bhpBase + (seededRand(seed + 5) - 0.5) * 3) * 100) / 100),
    }
  })
}

const BigDataAnalysis: React.FC = () => {
  const { selectedOrg, filteredDbWells } = useOrgContext()
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null)
  const [wellSearch, setWellSearch] = useState('')
  const [queryDate, setQueryDate] = useState<Dayjs>(dayjs())
  const [trendRange, setTrendRange] = useState<'1w' | '1m' | '3m' | 'all'>('1m')
  const [trendStart, setTrendStart] = useState<Dayjs>(dayjs().subtract(30, 'day'))
  const [trendEnd, setTrendEnd] = useState<Dayjs>(dayjs())

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

  const activeWells = useMemo(() => Array.from(convertedMap.values()).filter(w => w.status !== 'offline'), [convertedMap])

  const scatterData = useMemo(() => {
    return activeWells.map(w => {
      const eff = genDisplacementEff(w)
      const pInlet = genPumpInletPressure(w)
      const zone = getZone(eff, pInlet)
      return { name: w.name, eff, pInlet, zone, dailyLiquid: w.dailyLiquid }
    })
  }, [activeWells])

  const orgName = selectedOrg?.name || 'CNPCIC'

  const scatterOption = useMemo(() => {
    const seriesMap: Record<number, { name: string; data: any[]; color: string }> = {}
    zoneNames.forEach((name, i) => { seriesMap[i] = { name, data: [], color: zoneColors[i] } })
    scatterData.forEach(d => {
      seriesMap[d.zone].data.push({ value: [d.eff, d.pInlet], name: d.name })
    })
    const series = Object.values(seriesMap).map(s => ({
      name: s.name, type: 'scatter' as const, data: s.data, symbolSize: 10,
      itemStyle: { color: s.color, opacity: 0.8 },
    }))

    const boundaryLines = [
      { xAxis: 0.4, lineStyle: { color: '#1677ff', width: 2, type: 'solid' as const }, label: { show: false } },
      { xAxis: 2.0, lineStyle: { color: '#1677ff', width: 2, type: 'solid' as const }, label: { show: false } },
      { yAxis: 6.3, lineStyle: { color: '#1677ff', width: 2, type: 'solid' as const }, label: { show: false } },
      { yAxis: 2.0, xAxis: 0, lineStyle: { color: '#1677ff', width: 2, type: 'solid' as const }, label: { show: false } },
    ]

    const cornerPoints = [
      { value: [0.4, 20], symbol: 'circle', symbolSize: 8, itemStyle: { color: 'transparent', borderColor: '#ff4d4f', borderWidth: 2 } },
      { value: [2.0, 20], symbol: 'circle', symbolSize: 8, itemStyle: { color: 'transparent', borderColor: '#ff4d4f', borderWidth: 2 } },
      { value: [0.4, 6.3], symbol: 'circle', symbolSize: 8, itemStyle: { color: 'transparent', borderColor: '#ff4d4f', borderWidth: 2 } },
      { value: [2.0, 6.3], symbol: 'circle', symbolSize: 8, itemStyle: { color: 'transparent', borderColor: '#ff4d4f', borderWidth: 2 } },
      { value: [0, 6.3], symbol: 'circle', symbolSize: 8, itemStyle: { color: 'transparent', borderColor: '#ff4d4f', borderWidth: 2 } },
      { value: [3, 6.3], symbol: 'circle', symbolSize: 8, itemStyle: { color: 'transparent', borderColor: '#ff4d4f', borderWidth: 2 } },
      { value: [0, 2.0], symbol: 'circle', symbolSize: 8, itemStyle: { color: 'transparent', borderColor: '#ff4d4f', borderWidth: 2 } },
    ]

    const zoneMarkPoints = [
      { coord: [1.2, 4.2], name: 'I', symbol: 'circle', symbolSize: 1, label: { show: true, formatter: 'I', fontSize: 12, color: '#999' } },
      { coord: [0.2, 13], name: 'II', symbol: 'circle', symbolSize: 1, label: { show: true, formatter: 'II', fontSize: 12, color: '#999' } },
      { coord: [1.2, 13], name: 'III', symbol: 'circle', symbolSize: 1, label: { show: true, formatter: 'III', fontSize: 12, color: '#999' } },
      { coord: [2.5, 13], name: 'IV', symbol: 'circle', symbolSize: 1, label: { show: true, formatter: 'IV', fontSize: 12, color: '#999' } },
      { coord: [0.2, 1.5], name: 'V', symbol: 'circle', symbolSize: 1, label: { show: true, formatter: 'V', fontSize: 12, color: '#999' } },
      { coord: [2.5, 3.2], name: 'VI', symbol: 'circle', symbolSize: 1, label: { show: true, formatter: 'VI', fontSize: 12, color: '#999' } },
    ]

    return {
      title: { text: `${orgName} 宏观控制图`, left: 'center', top: 4, textStyle: { fontSize: 13, color: '#1677ff' } },
      tooltip: { trigger: 'item' as const, formatter: (p: any) => {
        if (!p.name || p.seriesName === 'boundary' || ['I','II','III','IV','V','VI'].includes(p.name)) return ''
        return `${p.name}<br/>排量效率: ${p.value[0]}<br/>泵入口压力: ${p.value[1]} MPa`
      }},
      legend: { data: zoneNames, top: 24, textStyle: { fontSize: 10 }, itemWidth: 12, itemHeight: 8 },
      grid: { left: 55, right: 15, top: 75, bottom: 35 },
      xAxis: { type: 'value' as const, name: '排量效率', min: 0, max: 3, axisLabel: { fontSize: 10 }, nameLocation: 'middle' as const, nameGap: 22, nameTextStyle: { fontSize: 11 } },
      yAxis: { type: 'value' as const, name: '泵入口压力(MPa)', min: 0, max: 20, axisLabel: { fontSize: 10 }, nameTextStyle: { fontSize: 11 } },
      series: [
        {
          ...series[0],
          markLine: { silent: true, symbol: 'arrow', symbolSize: [6, 8], data: boundaryLines },
          markArea: { silent: true, data: [
            [{ xAxis: 0.4, yAxis: 2, itemStyle: { color: 'rgba(82,196,26,0.08)' } }, { xAxis: 2.0, yAxis: 6.3 }],
          ]},
          markPoint: { silent: true, data: zoneMarkPoints, itemStyle: { color: 'transparent' } },
        },
        ...series.slice(1),
        {
          name: 'boundary', type: 'scatter' as const, data: cornerPoints,
          tooltip: { show: false }, silent: true, z: 10,
        },
      ],
    }
  }, [scatterData, orgName])

  const zoneStats = useMemo(() => {
    const counts = Array(6).fill(0)
    scatterData.forEach(d => counts[d.zone]++)
    const total = scatterData.length || 1
    return zoneNames.map((name, i) => ({
      key: i, zone: name.split('.')[1] || name, count: counts[i],
      percent: Math.round(counts[i] / total * 10000) / 100,
    }))
  }, [scatterData])

  const zoneColumns = [
    { title: '分区', dataIndex: 'zone', key: 'zone', width: 110,
      render: (v: string, _: any, idx: number) => <span style={{ color: zoneColors[idx], fontWeight: 500 }}>{v}</span>,
    },
    { title: '井数', dataIndex: 'count', key: 'count', width: 60, align: 'center' as const },
    { title: '占比(%)', dataIndex: 'percent', key: 'percent', width: 80, align: 'center' as const,
      render: (v: number) => v.toFixed(2),
    },
  ]

  const evalGrouped = useMemo(() => {
    const groups: Record<number, { name: string; wells: { key: string; name: string; dispEff: number; pInlet: number; dailyLiquid: number }[] }> = {}
    zoneNames.forEach((name, i) => { groups[i] = { name: name.split('.')[1] || name, wells: [] } })
    activeWells.forEach(w => {
      const eff = genDisplacementEff(w)
      const pInlet = genPumpInletPressure(w)
      const zone = getZone(eff, pInlet)
      groups[zone].wells.push({
        key: w.id, name: w.name,
        dispEff: Math.round(eff * 10000) / 100,
        pInlet, dailyLiquid: w.dailyLiquid,
      })
    })
    Object.values(groups).forEach(g => g.wells.sort((a, b) => b.dispEff - a.dispEff))
    return groups
  }, [activeWells])

  const evalColumns = [
    { title: '井名', dataIndex: 'name', key: 'name', ellipsis: true, render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: '排量效率(%)', dataIndex: 'dispEff', key: 'dispEff', width: 90, align: 'center' as const },
    { title: '泵入口压力(MPa)', dataIndex: 'pInlet', key: 'pInlet', width: 100, align: 'center' as const },
    { title: '日产液量(m³/d)', dataIndex: 'dailyLiquid', key: 'dailyLiquid', width: 95, align: 'center' as const },
  ]

  const evalSummary = useMemo(() => {
    const total = scatterData.length || 1
    const counts = Array(6).fill(0)
    scatterData.forEach(d => counts[d.zone]++)
    const normalRate = (counts[0] / total * 100).toFixed(1)
    const abnormalZones = zoneNames
      .map((n, i) => ({ name: n.split('.')[1] || n, count: counts[i], idx: i }))
      .filter(z => z.idx !== 0 && z.count > 0)
      .sort((a, b) => b.count - a.count)

    const mainIssue = abnormalZones.length > 0 ? abnormalZones[0] : null
    const level = Number(normalRate) >= 70 ? '良好' : Number(normalRate) >= 50 ? '一般' : '较差'
    const levelColor = level === '良好' ? '#52c41a' : level === '一般' ? '#faad14' : '#ff4d4f'

    const conclusion = `${orgName}区块共${total}口在线井，其中工况合理区${counts[0]}口（占比${normalRate}%），整体运行状态${level}。`
    const details = abnormalZones.map(z => `${z.name}${z.count}口`).join('，')
    const suggestion = mainIssue
      ? `异常分布：${details}。建议重点关注${mainIssue.name}的${mainIssue.count}口井，及时排查原因并制定优化措施。`
      : '所有井运行状态良好，建议保持当前运行参数，定期巡检。'

    return { conclusion, suggestion, level, levelColor, normalRate, total }
  }, [scatterData, orgName])

  const handleTrendRange = (k: '1w' | '1m' | '3m' | 'all') => {
    setTrendRange(k)
    const days = k === '1w' ? 7 : k === '1m' ? 30 : k === '3m' ? 90 : 180
    setTrendEnd(dayjs())
    setTrendStart(dayjs().subtract(days, 'day'))
  }

  const trendData = useMemo(() => {
    if (!selectedWell) return []
    return genProductionTrend(selectedWell, trendStart, trendEnd)
  }, [selectedWell, trendStart, trendEnd])

  const trendOption = useMemo(() => {
    if (!selectedWell || trendData.length === 0) return {}
    return {
      title: { text: `${selectedWell.name} 日产液量变化趋势曲线`, left: 'center', top: 4, textStyle: { fontSize: 13, color: '#1677ff' } },
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['日产液量(m³/d)', '平均流压(MPa)'], bottom: 0, textStyle: { fontSize: 11 }, itemWidth: 14, itemHeight: 8 },
      grid: { left: 50, right: 50, top: 30, bottom: 50 },
      xAxis: { type: 'category' as const, data: trendData.map(d => d.date), axisLabel: { fontSize: 10, rotate: 30 } },
      yAxis: [
        { type: 'value' as const, name: '日产液量(m³/d)', axisLabel: { fontSize: 10 } },
        { type: 'value' as const, name: '流压(MPa)', position: 'right' as const, axisLabel: { fontSize: 10 } },
      ],
      dataZoom: [{ type: 'inside' as const }],
      series: [
        { name: '日产液量(m³/d)', type: 'line' as const, data: trendData.map(d => d.liquid), smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { color: '#1677ff', width: 2 }, itemStyle: { color: '#1677ff' }, areaStyle: { color: 'rgba(22,119,255,0.06)' } },
        { name: '平均流压(MPa)', type: 'line' as const, yAxisIndex: 1, data: trendData.map(d => d.bhp), smooth: true, symbol: 'circle', symbolSize: 5, lineStyle: { color: '#ff4d4f', width: 2 }, itemStyle: { color: '#ff4d4f' } },
      ],
    }
  }, [selectedWell, trendData])

  return (
    <div className="page-container" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <Card bodyStyle={{ padding: '6px 16px' }} style={{ marginBottom: 8, flexShrink: 0 }}>
        <Space size={12}>
          <span style={{ fontWeight: 500, fontSize: 13 }}>前推日期：</span>
          <DatePicker value={queryDate} onChange={v => v && setQueryDate(v)} size="small" allowClear={false} style={{ width: 140 }} />
          <Button type="primary" size="small" icon={<SearchOutlined />}>查询</Button>
        </Space>
      </Card>

      {/* Main 3-column layout */}
      <div style={{ flex: 1, display: 'flex', gap: 8, overflow: 'hidden', minHeight: 0 }}>
        {/* Left: Well list */}
        <Card
          bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
          style={{ width: 160, flexShrink: 0, overflow: 'hidden' }}
          size="small"
          title={<span style={{ fontSize: 12 }}>井列表 {selectedOrg && <Tag color="blue" style={{ fontSize: 10 }}>{selectedOrg.name}</Tag>}</span>}
        >
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0' }}>
            <Input placeholder="搜索井号..." prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={wellSearch} onChange={e => setWellSearch(e.target.value)} allowClear size="small" style={{ fontSize: 12 }} />
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
                  <div key={wId} onClick={() => setSelectedWellId(wId)}
                    style={{
                      padding: '10px 16px', cursor: 'pointer',
                      borderLeft: isSel ? '3px solid #1677ff' : '3px solid transparent',
                      background: isSel ? '#e6f4ff' : 'transparent', transition: 'all 0.2s',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
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
                    {appW && <Badge status={statusColorMap[appW.status]} text={statusTextMap[appW.status]} />}
                  </div>
                )
              })
            )}
          </div>
        </Card>

        {/* Center: scatter + zone stats */}
        <div style={{ flex: 3, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto', minWidth: 0 }}>
          <Card size="small" bodyStyle={{ padding: '4px 8px' }} style={{ flexShrink: 0 }}>
            <ReactECharts option={scatterOption} style={{ height: 340 }} />
          </Card>
          <Card size="small" title={<span style={{ fontSize: 12, color: '#1677ff' }}>{orgName} 宏观评价统计</span>} bodyStyle={{ padding: 0 }} style={{ flexShrink: 0 }}>
            <Table
              className="zone-stats-table"
              columns={zoneColumns}
              dataSource={zoneStats}
              rowKey="key"
              size="small"
              pagination={false}
            />
          </Card>
        </div>

        {/* Right: eval table + trend chart */}
        <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', minWidth: 0 }}>
          <Card size="small" title={<span style={{ fontSize: 12, color: '#1677ff' }}>{orgName} 宏观动态评价</span>}
            bodyStyle={{ padding: 0, flex: 1, overflow: 'auto' }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {(() => {
              const nonEmpty = zoneNames.map((_, i) => i).filter(i => evalGrouped[i]?.wells.length > 0)
              const firstKey = nonEmpty[0] ?? 0
              return (
                <Collapse
                  className="eval-zone-collapse"
                  defaultActiveKey={[firstKey]}
                  size="small"
                  items={nonEmpty.map(zIdx => {
                    const group = evalGrouped[zIdx]
                    return {
                      key: zIdx,
                      label: (
                        <span style={{ fontSize: 12, fontWeight: 600, color: zoneColors[zIdx] }}>
                          {group.name}:共{group.wells.length}(口)
                        </span>
                      ),
                      children: (
                        <Table
                          className="eval-table"
                          columns={evalColumns}
                          dataSource={group.wells}
                          rowKey="key"
                          size="small"
                          pagination={false}
                        />
                      ),
                    }
                  })}
                />
              )
            })()}
          </Card>
          <Card size="small" bodyStyle={{ padding: '4px 8px' }} style={{ flexShrink: 0 }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: '100%' }}>
                {(['1w', '1m', '3m', 'all'] as const).map(k => (
                  <Button key={k} size="small" type={trendRange === k ? 'primary' : 'default'}
                    onClick={() => handleTrendRange(k)} style={{ fontSize: 11, padding: '0 6px', height: 22 }}>
                    {k === '1w' ? '1周' : k === '1m' ? '1月' : k === '3m' ? '3月' : '全部'}
                  </Button>
                ))}
                <div style={{ flex: 1 }} />
                <DatePicker value={trendStart} onChange={v => { if (v) { setTrendStart(v); setTrendRange('all') } }}
                  size="small" allowClear={false} format="YYYY-MM-DD" style={{ width: 105, fontSize: 10, height: 22 }} />
                <span style={{ fontSize: 10, color: '#999', lineHeight: '22px' }}>至</span>
                <DatePicker value={trendEnd} onChange={v => { if (v) { setTrendEnd(v); setTrendRange('all') } }}
                  size="small" allowClear={false} format="YYYY-MM-DD" style={{ width: 105, fontSize: 10, height: 22 }} />
              </div>
            }
          >
            <ReactECharts option={trendOption} style={{ height: 220 }} />
          </Card>
        </div>
      </div>

      {/* Bottom: AI summary */}
      <Card size="small" style={{ marginTop: 8, flexShrink: 0 }} bodyStyle={{ padding: '8px 16px' }}
        title={
          <span style={{ fontSize: 12, color: '#1677ff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RobotOutlined style={{ fontSize: 14 }} /> AI 诊断结论与建议
          </span>
        }
      >
        <div style={{ fontSize: 12, lineHeight: 1.8, color: '#333' }}>
          <div style={{ marginBottom: 4 }}>
            <Tag color="#1677ff" style={{ fontWeight: 600, marginRight: 6 }}>总体评价结论</Tag>
            {evalSummary.conclusion}
            <Tag color={evalSummary.levelColor} style={{ marginLeft: 6, fontWeight: 600 }}>{evalSummary.level}</Tag>
          </div>
          <div>
            <Tag color="#722ed1" style={{ fontWeight: 600, marginRight: 6 }}>综合评价</Tag>
            {evalSummary.suggestion}
          </div>
        </div>
      </Card>

      <style>{`
        .zone-stats-table .ant-table-thead > tr > th,
        .eval-table .ant-table-thead > tr > th {
          background: #e6f4ff !important;
          color: #1677ff;
          font-weight: 600;
          font-size: 12px;
        }
        .eval-zone-collapse .ant-collapse-item > .ant-collapse-header {
          padding: 6px 12px !important;
          background: #fafafa;
          border-bottom: 1px solid #f0f0f0;
          min-height: auto;
        }
        .eval-zone-collapse .ant-collapse-content > .ant-collapse-content-box {
          padding: 0 !important;
        }
        .eval-zone-collapse .ant-collapse-item {
          border-bottom: none;
        }
        .eval-zone-collapse .eval-table .ant-table-thead > tr > th {
          padding: 4px 8px !important;
          font-size: 11px;
        }
        .eval-zone-collapse .eval-table .ant-table-tbody > tr > td {
          padding: 4px 8px !important;
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}

export default BigDataAnalysis
