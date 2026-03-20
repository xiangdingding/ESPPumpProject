import React, { useState, useMemo, useEffect } from 'react'
import { Card, Tag, Badge, DatePicker, Button, Space, Table, Input, Empty, message } from 'antd'
import { SearchOutlined, RobotOutlined, ExportOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
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

// ---- BigData 6-zone evaluation ----
const bdZoneNames = ['工况合理区', '排量异常区', '沉没度偏大区', '潜力区', '供液不足区', '扬程偏大区']
function getZone6(eff: number, pInlet: number): number {
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

// ---- Industry Standard 5-zone evaluation ----
const stdZoneNames = ['参数偏大区', '生产异常区', '资料核实区', '工况合理区', '参数偏小区']
const LINE1: [number, number][] = [
  [0, 12.2], [20, 12.2], [40, 12.3], [60, 12.5], [80, 13.0], [100, 13.5], [120, 14.8], [130, 15.5], [135, 16.0], [145, 16.8], [155, 17.2], [165, 17.8], [170, 18.0],
]
const LINE2: [number, number][] = [
  [0, 0.5], [10, 1.2], [20, 2.0], [30, 2.8], [36, 3.5], [50, 4.2], [60, 4.8], [80, 5.0], [100, 5.5], [120, 6.0], [140, 6.8], [160, 8.0], [170, 8.5],
]
const LINE3: [number, number][] = [[0, 12.2], [36, 3.5]]
const LINE4: [number, number][] = [[135, 16.0], [170, 8.5]]
function interpLine(pts: [number, number][], x: number): number {
  if (x <= pts[0][0]) return pts[0][1]
  if (x >= pts[pts.length - 1][0]) return pts[pts.length - 1][1]
  for (let i = 0; i < pts.length - 1; i++) {
    if (x >= pts[i][0] && x <= pts[i + 1][0]) {
      const t = (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0])
      return pts[i][1] + t * (pts[i + 1][1] - pts[i][1])
    }
  }
  return pts[pts.length - 1][1]
}
function getStdZone(eff: number, bhp: number): number {
  const leftY = interpLine(LINE3, eff)
  if (eff <= 36 && bhp <= leftY) return 0
  const rightY = interpLine(LINE4, eff)
  if (eff >= 135 && bhp >= rightY) return 4
  const upper = interpLine(LINE1, Math.min(eff, 135))
  if (bhp > upper) return 1
  const lower = interpLine(LINE2, Math.max(eff, 36))
  if (eff >= 36 && bhp < lower) return 2
  return 3
}
function genWellBhp(well: WellInfo): number {
  const seed = well.id.charCodeAt(0) * 11 + well.id.charCodeAt(well.id.length - 1)
  const r = seededRand(seed)
  if (well.status === 'alarm') return Math.round((1 + r * 5) * 100) / 100
  if (well.status === 'warning') return Math.round((3 + r * 8) * 100) / 100
  return Math.round((3 + r * 10) * 100) / 100
}
function genWellDispEff(well: WellInfo): number {
  const seed = well.id.charCodeAt(0) * 7 + well.id.charCodeAt(well.id.length - 1)
  const r = seededRand(seed)
  if (well.status === 'alarm') return Math.round((10 + r * 60) * 100) / 100
  if (well.status === 'warning') return Math.round((30 + r * 80) * 100) / 100
  return Math.round((40 + r * 120) * 100) / 100
}

// ---- NineZone evaluation ----
const nzZoneShortNames = [
  '供液不足-参数偏低', '供液不足-参数合理', '供液不足-参数偏高',
  '供液正常-参数偏低', '供液正常-参数合理', '供液正常-参数偏高',
  '供液充足-参数偏低', '供液充足-参数合理', '供液充足-参数偏高',
]
function getZone9(well: WellInfo): number {
  const seed = well.id.charCodeAt(0) * 7 + well.id.charCodeAt(well.id.length - 1)
  const r1 = seededRand(seed)
  const r2 = seededRand(seed + 3)
  let supplyLevel: number
  if (well.submergence < 150 || well.status === 'alarm') supplyLevel = 0
  else if (well.submergence > 400) supplyLevel = 2
  else supplyLevel = 1
  let paramLevel: number
  if (well.efficiency < 30 || r1 < 0.2) paramLevel = 0
  else if (well.efficiency > 55 || r2 > 0.8) paramLevel = 2
  else paramLevel = 1
  return supplyLevel * 3 + paramLevel
}

// ---- Zone color maps ----
const bdZoneColorMap: Record<string, string> = {
  '工况合理区': '#52c41a', '排量异常区': '#ff4d4f', '沉没度偏大区': '#1677ff',
  '潜力区': '#faad14', '供液不足区': '#722ed1', '扬程偏大区': '#13c2c2',
}
const stdZoneColorMap: Record<string, string> = {
  '参数偏大区': '#FF00FF', '生产异常区': '#FF0000', '资料核实区': '#FF7E50',
  '工况合理区': '#00B050', '参数偏小区': '#00B0F0',
}
const nzZoneColorMap: Record<string, string> = {
  '供液不足-参数偏低': '#ff7875', '供液不足-参数合理': '#ffa940', '供液不足-参数偏高': '#ff4d4f',
  '供液正常-参数偏低': '#69b1ff', '供液正常-参数合理': '#52c41a', '供液正常-参数偏高': '#ffc53d',
  '供液充足-参数偏低': '#36cfc9', '供液充足-参数合理': '#95de64', '供液充足-参数偏高': '#bae637',
}

interface WellRow {
  key: string
  name: string
  pumpInletPressure: number
  pumpOutletPressure: number
  dailyLiquid: number
  ratedDisplacement: number
  displacementEff: number
  bdZone: string
  stdZone: string
  nzZone: string
}

const EvaluationResult: React.FC = () => {
  const { selectedOrg, filteredDbWells } = useOrgContext()
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null)
  const [wellSearch, setWellSearch] = useState('')
  const [queryDate, setQueryDate] = useState<Dayjs>(dayjs())

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

  useEffect(() => {
    setWellSearch('')
    if (sortedWells.length > 0) setSelectedWellId(String(sortedWells[0].Well_Id))
    else setSelectedWellId(null)
  }, [filteredDbWells])

  const activeWells = useMemo(() => Array.from(convertedMap.values()).filter(w => w.status !== 'offline'), [convertedMap])

  const tableData = useMemo<WellRow[]>(() => {
    return activeWells.map(w => {
      const pInlet = genPumpInletPressure(w)
      const dispEff = genDisplacementEff(w)
      const bdZ = getZone6(dispEff, pInlet)
      const wellDispEff = genWellDispEff(w)
      const wellBhp = genWellBhp(w)
      const stdZ = getStdZone(wellDispEff, wellBhp)
      const nzZ = getZone9(w)
      const seed = w.id.charCodeAt(0) * 3 + w.id.charCodeAt(w.id.length - 1)
      const ratedDisp = Math.round((20 + seededRand(seed) * 80) * 10) / 10
      const pOutlet = Math.round((pInlet + 5 + seededRand(seed + 2) * 15) * 100) / 100
      return {
        key: w.id,
        name: w.name,
        pumpInletPressure: pInlet,
        pumpOutletPressure: pOutlet,
        dailyLiquid: w.dailyLiquid,
        ratedDisplacement: ratedDisp,
        displacementEff: Math.round(dispEff * 100),
        bdZone: bdZoneNames[bdZ],
        stdZone: stdZoneNames[stdZ],
        nzZone: nzZoneShortNames[nzZ],
      }
    })
  }, [activeWells])

  const orgName = selectedOrg?.name || 'CNPCIC'

  const bdStats = useMemo(() => {
    const counts: Record<string, number> = {}
    bdZoneNames.forEach(n => { counts[n] = 0 })
    tableData.forEach(r => { counts[r.bdZone] = (counts[r.bdZone] || 0) + 1 })
    return counts
  }, [tableData])

  const stdStats = useMemo(() => {
    const counts: Record<string, number> = {}
    stdZoneNames.forEach(n => { counts[n] = 0 })
    tableData.forEach(r => { counts[r.stdZone] = (counts[r.stdZone] || 0) + 1 })
    return counts
  }, [tableData])

  const nzStats = useMemo(() => {
    const counts: Record<string, number> = {}
    nzZoneShortNames.forEach(n => { counts[n] = 0 })
    tableData.forEach(r => { counts[r.nzZone] = (counts[r.nzZone] || 0) + 1 })
    return counts
  }, [tableData])

  const pieOption = useMemo(() => {
    const total = tableData.length || 1
    const data = bdZoneNames.map(name => ({
      name, value: bdStats[name] || 0,
      itemStyle: { color: bdZoneColorMap[name] },
    })).filter(d => d.value > 0)
    return {
      title: { text: '大数据评价分布', left: 'center', top: 2, textStyle: { fontSize: 12, color: '#1677ff' } },
      tooltip: { trigger: 'item' as const, formatter: (p: any) => `${p.name}: ${p.value}口 (${((p.value / total) * 100).toFixed(1)}%)` },
      legend: { bottom: 0, textStyle: { fontSize: 9 }, itemWidth: 10, itemHeight: 6 },
      series: [{
        type: 'pie' as const, radius: ['25%', '55%'], center: ['50%', '48%'],
        itemStyle: { borderRadius: 3, borderColor: '#fff', borderWidth: 1 },
        label: { show: true, formatter: '{d}%', fontSize: 9 },
        data,
      }],
    }
  }, [tableData, bdStats])

  const stdPieOption = useMemo(() => {
    const total = tableData.length || 1
    const data = stdZoneNames.map(name => ({
      name, value: stdStats[name] || 0,
      itemStyle: { color: stdZoneColorMap[name] },
    })).filter(d => d.value > 0)
    return {
      title: { text: '行业标准评价分布', left: 'center', top: 2, textStyle: { fontSize: 12, color: '#1677ff' } },
      tooltip: { trigger: 'item' as const, formatter: (p: any) => `${p.name}: ${p.value}口 (${((p.value / total) * 100).toFixed(1)}%)` },
      legend: { bottom: 0, textStyle: { fontSize: 9 }, itemWidth: 10, itemHeight: 6 },
      series: [{
        type: 'pie' as const, radius: ['25%', '55%'], center: ['50%', '48%'],
        itemStyle: { borderRadius: 3, borderColor: '#fff', borderWidth: 1 },
        label: { show: true, formatter: '{d}%', fontSize: 9 },
        data,
      }],
    }
  }, [tableData, stdStats])

  const nzPieOption = useMemo(() => {
    const total = tableData.length || 1
    const data = nzZoneShortNames.map(name => ({
      name, value: nzStats[name] || 0,
      itemStyle: { color: nzZoneColorMap[name] },
    })).filter(d => d.value > 0)
    return {
      title: { text: '九区评价分布', left: 'center', top: 2, textStyle: { fontSize: 12, color: '#1677ff' } },
      tooltip: { trigger: 'item' as const, formatter: (p: any) => `${p.name}: ${p.value}口 (${((p.value / total) * 100).toFixed(1)}%)` },
      legend: { bottom: 0, textStyle: { fontSize: 9 }, itemWidth: 10, itemHeight: 6 },
      series: [{
        type: 'pie' as const, radius: ['25%', '55%'], center: ['50%', '48%'],
        itemStyle: { borderRadius: 3, borderColor: '#fff', borderWidth: 1 },
        label: { show: false },
        data,
      }],
    }
  }, [tableData, nzStats])

  const columns = [
    { title: '序号', key: 'idx', width: 50, align: 'center' as const,
      render: (_: any, __: any, i: number) => <span style={{ color: '#999' }}>{i + 1}</span> },
    { title: '井号', dataIndex: 'name', key: 'name', width: 110, ellipsis: true,
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: '泵入口压力(MPa)', dataIndex: 'pumpInletPressure', key: 'pip', width: 120, align: 'center' as const,
      sorter: (a: WellRow, b: WellRow) => a.pumpInletPressure - b.pumpInletPressure },
    { title: '泵出口压力(MPa)', dataIndex: 'pumpOutletPressure', key: 'pop', width: 120, align: 'center' as const,
      sorter: (a: WellRow, b: WellRow) => a.pumpOutletPressure - b.pumpOutletPressure },
    { title: '日产液量(m³/d)', dataIndex: 'dailyLiquid', key: 'dl', width: 110, align: 'center' as const,
      sorter: (a: WellRow, b: WellRow) => a.dailyLiquid - b.dailyLiquid },
    { title: '额定排量(m³/d)', dataIndex: 'ratedDisplacement', key: 'rd', width: 110, align: 'center' as const },
    { title: '排量效率(%)', dataIndex: 'displacementEff', key: 'de', width: 100, align: 'center' as const,
      sorter: (a: WellRow, b: WellRow) => a.displacementEff - b.displacementEff,
      render: (v: number) => <span style={{ fontWeight: 600, color: v >= 80 ? '#52c41a' : v >= 50 ? '#faad14' : '#ff4d4f' }}>{v}</span> },
    { title: '大数据宏观评价结果', dataIndex: 'bdZone', key: 'bd', width: 140, align: 'center' as const,
      filters: bdZoneNames.map(n => ({ text: n, value: n })),
      onFilter: (value: any, record: WellRow) => record.bdZone === value,
      render: (v: string) => <Tag color={bdZoneColorMap[v]} style={{ fontSize: 11 }}>{v}</Tag> },
    { title: '行业标准评价结果', dataIndex: 'stdZone', key: 'std', width: 130, align: 'center' as const,
      filters: stdZoneNames.map(n => ({ text: n, value: n })),
      onFilter: (value: any, record: WellRow) => record.stdZone === value,
      render: (v: string) => <Tag color={stdZoneColorMap[v]} style={{ fontSize: 11 }}>{v}</Tag> },
    { title: '宏观九区评价结果', dataIndex: 'nzZone', key: 'nz', width: 140, align: 'center' as const,
      filters: nzZoneShortNames.map(n => ({ text: n, value: n })),
      onFilter: (value: any, record: WellRow) => record.nzZone === value,
      render: (v: string) => <Tag color={nzZoneColorMap[v]} style={{ fontSize: 11 }}>{v}</Tag> },
  ]

  const evalSummary = useMemo(() => {
    const total = tableData.length || 1
    const bdNormal = bdStats['工况合理区'] || 0
    const bdNormalRate = ((bdNormal / total) * 100).toFixed(1)
    const stdNormal = stdStats['工况合理区'] || 0
    const stdNormalRate = ((stdNormal / total) * 100).toFixed(1)
    const nzNormal = nzStats['供液正常-参数合理'] || 0
    const nzNormalRate = ((nzNormal / total) * 100).toFixed(1)

    const bdAbnormal = total - bdNormal
    const stdAbnormal = total - stdNormal
    const nzAbnormal = total - nzNormal

    let level = '良好'
    let levelColor = '#1677ff'
    const avgNormalRate = (bdNormal + stdNormal + nzNormal) / (3 * total)
    if (avgNormalRate > 0.6) { level = '优秀'; levelColor = '#52c41a' }
    else if (avgNormalRate > 0.4) { level = '良好'; levelColor = '#1677ff' }
    else if (avgNormalRate > 0.2) { level = '一般'; levelColor = '#faad14' }
    else { level = '较差'; levelColor = '#ff4d4f' }

    const conclusion = `${orgName}共${total}口井参与综合评价。` +
      `大数据宏观评价：工况合理区${bdNormal}口(${bdNormalRate}%)，异常井${bdAbnormal}口；` +
      `行业标准评价：工况合理区${stdNormal}口(${stdNormalRate}%)，异常井${stdAbnormal}口；` +
      `宏观九区评价：供液正常-参数合理${nzNormal}口(${nzNormalRate}%)，其余${nzAbnormal}口需关注。`

    const suggestions: string[] = []
    const bdTopAbnormal = Object.entries(bdStats).filter(([k]) => k !== '工况合理区').sort((a, b) => b[1] - a[1]).slice(0, 2)
    if (bdTopAbnormal.length > 0 && bdTopAbnormal[0][1] > 0) {
      suggestions.push(`大数据评价主要异常集中在：${bdTopAbnormal.map(([k, v]) => `${k}(${v}口)`).join('、')}`)
    }
    const stdTopAbnormal = Object.entries(stdStats).filter(([k]) => k !== '工况合理区').sort((a, b) => b[1] - a[1]).slice(0, 2)
    if (stdTopAbnormal.length > 0 && stdTopAbnormal[0][1] > 0) {
      suggestions.push(`行业标准评价主要异常：${stdTopAbnormal.map(([k, v]) => `${k}(${v}口)`).join('、')}`)
    }
    if (bdAbnormal > total * 0.3) suggestions.push('建议对排量异常和供液不足井制定专项优化方案')
    if (stdAbnormal > total * 0.3) suggestions.push('建议对生产异常区和资料核实区井加强参数核查')
    if (suggestions.length === 0) suggestions.push('三项评价结果整体良好，建议持续监测并保持当前运行策略')

    return { conclusion, suggestion: suggestions.join('；'), level, levelColor }
  }, [tableData, bdStats, stdStats, nzStats, orgName])

  const handleDateNav = (dir: number) => {
    setQueryDate(prev => prev.add(dir, 'day'))
  }

  return (
    <div className="page-container" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <Card bodyStyle={{ padding: '6px 16px' }} style={{ marginBottom: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space size={8}>
            <span style={{ fontWeight: 500, fontSize: 13 }}>评价日期：</span>
            <Button size="small" icon={<LeftOutlined />} onClick={() => handleDateNav(-1)} />
            <DatePicker value={queryDate} onChange={v => v && setQueryDate(v)} size="small" allowClear={false} style={{ width: 130 }} />
            <Button size="small" icon={<RightOutlined />} onClick={() => handleDateNav(1)} />
            <Button type="primary" size="small" icon={<SearchOutlined />}>查询</Button>
            <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>
              共 <span style={{ color: '#1677ff', fontWeight: 600 }}>{tableData.length}</span> 口井
            </span>
          </Space>
          <Button size="small" icon={<ExportOutlined />} onClick={() => message.success('评价数据已导出')}>导出数据</Button>
        </div>
      </Card>

      {/* Main: left well list + right content */}
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

        {/* Right: table + charts + AI */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', minWidth: 0 }}>
          {/* Main table */}
          <Card size="small" bodyStyle={{ padding: 0, overflow: 'auto', flex: 1 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            title={<span style={{ fontSize: 12, color: '#1677ff' }}>{orgName} 综合评价结果汇总</span>}
          >
            <Table<WellRow>
              className="eval-result-table"
              columns={columns}
              dataSource={tableData}
              rowKey="key"
              size="small"
              pagination={false}
              style={{ minWidth: 1300 }}
              onRow={(record) => ({
                onClick: () => setSelectedWellId(record.key),
                style: { cursor: 'pointer', background: record.key === selectedWellId ? '#e6f4ff' : undefined },
              })}
            />
          </Card>

          {/* Bottom: 3 pie charts */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Card size="small" bodyStyle={{ padding: '0 4px' }} style={{ flex: 1 }}>
              <ReactECharts option={pieOption} style={{ height: 180 }} />
            </Card>
            <Card size="small" bodyStyle={{ padding: '0 4px' }} style={{ flex: 1 }}>
              <ReactECharts option={stdPieOption} style={{ height: 180 }} />
            </Card>
            <Card size="small" bodyStyle={{ padding: '0 4px' }} style={{ flex: 1 }}>
              <ReactECharts option={nzPieOption} style={{ height: 180 }} />
            </Card>
          </div>
        </div>
      </div>

      {/* AI Summary */}
      <Card size="small" style={{ marginTop: 8, flexShrink: 0 }} bodyStyle={{ padding: '8px 16px' }}
        title={
          <span style={{ fontSize: 12, color: '#1677ff', display: 'flex', alignItems: 'center', gap: 6 }}>
            <RobotOutlined style={{ fontSize: 14 }} /> AI 诊断结论与建议
          </span>
        }
      >
        <div style={{ fontSize: 12, lineHeight: 1.8, color: '#333' }}>
          <div style={{ marginBottom: 4 }}>
            <Tag color="#1677ff" style={{ fontWeight: 600, marginRight: 6 }}>综合评价结论</Tag>
            {evalSummary.conclusion}
            <Tag color={evalSummary.levelColor} style={{ marginLeft: 6, fontWeight: 600 }}>{evalSummary.level}</Tag>
          </div>
          <div>
            <Tag color="#722ed1" style={{ fontWeight: 600, marginRight: 6 }}>综合建议</Tag>
            {evalSummary.suggestion}
          </div>
        </div>
      </Card>

      <style>{`
        .eval-result-table .ant-table-thead > tr > th {
          background: #e6f4ff !important;
          color: #1677ff;
          font-weight: 600;
          font-size: 12px;
          white-space: nowrap;
        }
        .eval-result-table .ant-table-tbody > tr > td {
          font-size: 12px;
        }
        .eval-result-table .ant-table-tbody > tr:hover > td {
          background: #f0f7ff !important;
        }
        .eval-result-table .ant-table-thead > tr > th {
          position: sticky;
          top: 0;
          z-index: 2;
        }
      `}</style>
    </div>
  )
}

export default EvaluationResult
