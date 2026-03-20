import React, { useState, useMemo, useEffect } from 'react'
import { Card, Select, Tag, Space, DatePicker, Table, Badge, Input, Empty, Divider } from 'antd'
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

function genDailyCard(well: WellInfo, baseDate: Dayjs) {
  const base = well.current
  const dateSeed = baseDate.unix()
  return Array.from({ length: 24 }, (_, h) => {
    const seed = dateSeed + h * 37 + well.id.charCodeAt(well.id.length - 1)
    const r = seededRand(seed)
    const timeEffect = Math.sin((h - 6) / 24 * 2 * Math.PI) * 0.15
    const norm = Math.max(0, Math.min(1, 0.3 + (0.5 + timeEffect + (r - 0.5) * 0.3) * 0.5))
    return { hour: h, value: Math.round(norm * base * 100) / 100, normalized: Math.round(norm * 100) / 100 }
  })
}

function genWeeklyCard(well: WellInfo, endDate: Dayjs) {
  const base = well.current
  return Array.from({ length: 7 }, (_, d) => {
    const date = endDate.subtract(6 - d, 'day')
    const seed = date.unix() + well.id.charCodeAt(0) * 7
    const hourly = Array.from({ length: 24 }, (__, h) => {
      const r = seededRand(seed + h * 13)
      return 0.3 + r * 0.5
    })
    const avg = hourly.reduce((s, v) => s + v, 0) / 24
    return { date: date.format('YYYY-MM-DD'), dateShort: date.format('MM-DD'), value: Math.round(avg * base * 100) / 100, normalized: Math.round(avg * 100) / 100 }
  })
}

function genCurrentTrend(well: WellInfo, startDate: Dayjs, endDate: Dayjs) {
  const days = endDate.diff(startDate, 'day') + 1
  const base = well.current
  return Array.from({ length: days }, (_, i) => {
    const t = startDate.add(i, 'day')
    const seed = t.unix() + well.id.charCodeAt(0)
    const r = seededRand(seed)
    const drift = well.status === 'alarm' ? i * 0.08 : 0
    return { time: t.format('YYYY-MM-DD'), value: Math.round((base + (r - 0.5) * base * 0.2 + drift) * 100) / 100 }
  })
}

interface DiagRecord {
  key: number
  seq: number
  time: string
  current: number
  result: string
  resultColor: string
}

function genDiagRecords(well: WellInfo, startDate: Dayjs, endDate: Dayjs): DiagRecord[] {
  const days = endDate.diff(startDate, 'day') + 1
  const count = Math.min(days, 30)
  const base = well.current
  const rated = 30
  return Array.from({ length: count }, (_, i) => {
    const d = startDate.add(i, 'day')
    const seed = d.unix() + well.id.charCodeAt(0)
    const r = seededRand(seed)
    const val = Math.round((base + (r - 0.5) * base * 0.25) * 100) / 100
    const ratio = val / rated
    let result = '正常'
    let resultColor = '#52c41a'
    if (well.status === 'alarm' && r > 0.5) {
      result = ratio > 1.2 ? '过载报警' : '波形异常'
      resultColor = '#ff4d4f'
    } else if (well.status === 'warning' && r > 0.6) {
      result = '轻微异常'
      resultColor = '#faad14'
    } else if (ratio > 1.15) {
      result = '电流偏高'
      resultColor = '#fa8c16'
    } else if (ratio < 0.5) {
      result = '电流偏低'
      resultColor = '#faad14'
    }
    return { key: i, seq: i + 1, time: d.format('YYYY-MM-DD'), current: val, result, resultColor }
  })
}

const CurrentSignalDiagnosis: React.FC = () => {
  const { selectedOrg, filteredDbWells } = useOrgContext()
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null)
  const [wellSearch, setWellSearch] = useState('')
  const [dailyDate, setDailyDate] = useState<Dayjs>(dayjs())
  const [weekStart, setWeekStart] = useState<Dayjs>(dayjs().subtract(6, 'day'))
  const [weekEnd, setWeekEnd] = useState<Dayjs>(dayjs())

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

  const dailyCardData = useMemo(() => selectedWell ? genDailyCard(selectedWell, dailyDate) : [], [selectedWell, dailyDate])
  const weeklyCardData = useMemo(() => selectedWell ? genWeeklyCard(selectedWell, weekEnd) : [], [selectedWell, weekEnd])
  const trendData = useMemo(() => selectedWell ? genCurrentTrend(selectedWell, weekStart, weekEnd) : [], [selectedWell, weekStart, weekEnd])
  const diagRecords = useMemo(() => selectedWell ? genDiagRecords(selectedWell, weekStart, weekEnd) : [], [selectedWell, weekStart, weekEnd])

  const dailyCardOption = useMemo(() => {
    if (!selectedWell || dailyCardData.length === 0) return {}
    const hourLabels = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
    const vals = dailyCardData.map(d => d.normalized)
    vals.push(vals[0])
    return {
      title: { text: '电流日卡片', left: 'center', top: 4, textStyle: { fontSize: 13, color: '#1677ff' } },
      polar: { radius: ['8%', '68%'], center: ['50%', '54%'] },
      angleAxis: {
        type: 'category' as const, data: hourLabels, boundaryGap: false, startAngle: 90,
        axisLine: { lineStyle: { color: '#999' } }, axisLabel: { fontSize: 10, color: '#666' },
        splitLine: { show: true, lineStyle: { color: '#e0e0e0', type: 'dashed' as const } },
      },
      radiusAxis: {
        min: 0, max: 1, splitNumber: 5,
        axisLabel: { fontSize: 9, color: '#999', formatter: (v: number) => v.toFixed(1) },
        axisLine: { lineStyle: { color: '#ccc' } }, splitLine: { lineStyle: { color: '#e8e8e8' } },
      },
      tooltip: {
        trigger: 'item' as const,
        formatter: (p: any) => { const d = dailyCardData[p.dataIndex % 24]; return d ? `${String(d.hour).padStart(2, '0')}:00<br/>电流: ${d.value} A` : '' },
      },
      series: [{
        type: 'line' as const, coordinateSystem: 'polar', data: vals, smooth: true,
        symbol: 'circle', symbolSize: 3, lineStyle: { width: 1.5, color: '#5b8c00' },
        areaStyle: { color: { type: 'radial', x: 0.5, y: 0.5, r: 0.7, colorStops: [{ offset: 0, color: 'rgba(82,196,26,0.05)' }, { offset: 1, color: 'rgba(82,196,26,0.35)' }] } },
        itemStyle: { color: '#5b8c00' },
      }],
      graphic: [{ type: 'text' as const, left: 'center', top: 'middle', style: { text: `${selectedWell.name}\n${dailyDate.format('YYYY-MM-DD')}`, fontSize: 11, fill: '#1677ff', fontWeight: 'bold' as const, textAlign: 'center' as const }, z: 100 }],
    }
  }, [dailyCardData, selectedWell, dailyDate])

  const weeklyCardOption = useMemo(() => {
    if (!selectedWell || weeklyCardData.length === 0) return {}
    const labels = weeklyCardData.map(d => d.dateShort)
    const vals = weeklyCardData.map(d => d.normalized)
    vals.push(vals[0])
    return {
      title: { text: '电流周卡片', left: 'center', top: 4, textStyle: { fontSize: 13, color: '#1677ff' } },
      polar: { radius: ['8%', '68%'], center: ['50%', '54%'] },
      angleAxis: {
        type: 'category' as const, data: labels, boundaryGap: false, startAngle: 90,
        axisLine: { lineStyle: { color: '#999' } }, axisLabel: { fontSize: 10, color: '#666' },
        splitLine: { show: true, lineStyle: { color: '#e0e0e0', type: 'dashed' as const } },
      },
      radiusAxis: {
        min: 0, max: 1, splitNumber: 5,
        axisLabel: { fontSize: 9, color: '#999', formatter: (v: number) => v.toFixed(1) },
        axisLine: { lineStyle: { color: '#ccc' } }, splitLine: { lineStyle: { color: '#e8e8e8' } },
      },
      tooltip: {
        trigger: 'item' as const,
        formatter: (p: any) => { const d = weeklyCardData[p.dataIndex % 7]; return d ? `${d.date}<br/>电流: ${d.value} A` : '' },
      },
      series: [{
        type: 'line' as const, coordinateSystem: 'polar', data: vals, smooth: true,
        symbol: 'circle', symbolSize: 4, lineStyle: { width: 1.5, color: '#1677ff' },
        areaStyle: { color: { type: 'radial', x: 0.5, y: 0.5, r: 0.7, colorStops: [{ offset: 0, color: 'rgba(22,119,255,0.05)' }, { offset: 1, color: 'rgba(22,119,255,0.3)' }] } },
        itemStyle: { color: '#1677ff' },
      }],
      graphic: [{ type: 'text' as const, left: 'center', top: 'middle', style: { text: `${selectedWell.name}\n${weekStart.format('MM-DD')}~${weekEnd.format('MM-DD')}`, fontSize: 11, fill: '#1677ff', fontWeight: 'bold' as const, textAlign: 'center' as const }, z: 100 }],
    }
  }, [weeklyCardData, selectedWell, weekStart, weekEnd])

  const trendOption = useMemo(() => {
    if (!selectedWell || trendData.length === 0) return {}
    return {
      title: { text: `${selectedWell.name} 电流变化趋势曲线`, left: 'center', top: 4, textStyle: { fontSize: 13, color: '#1677ff' } },
      tooltip: { trigger: 'axis' as const, formatter: (p: any) => `${p[0].axisValue}<br/>泵电流: ${p[0].data} A` },
      grid: { left: 55, right: 20, top: 40, bottom: 40 },
      xAxis: { type: 'category' as const, data: trendData.map(d => d.time), axisLabel: { fontSize: 10, rotate: 30 } },
      yAxis: { type: 'value' as const, name: '泵电流(A)', axisLabel: { fontSize: 10 } },
      dataZoom: [{ type: 'inside' as const }, { type: 'slider' as const, height: 14, bottom: 4 }],
      series: [{
        type: 'line' as const, data: trendData.map(d => d.value), smooth: true,
        symbol: 'circle', symbolSize: 4,
        lineStyle: { width: 1.5, color: '#1890ff' }, areaStyle: { color: 'rgba(24,144,255,0.08)' },
        itemStyle: { color: '#1890ff' },
      }],
    }
  }, [selectedWell, trendData])

  const currentSummary = useMemo(() => {
    if (!selectedWell || diagRecords.length === 0) return null
    const total = diagRecords.length
    const normalCount = diagRecords.filter(r => r.result === '正常').length
    const normalRate = (normalCount / total * 100).toFixed(1)
    const abnormals = diagRecords.filter(r => r.result !== '正常')
    const abnormalTypes: Record<string, number> = {}
    abnormals.forEach(r => { abnormalTypes[r.result] = (abnormalTypes[r.result] || 0) + 1 })
    const sortedTypes = Object.entries(abnormalTypes).sort((a, b) => b[1] - a[1])

    const avgCurrent = (diagRecords.reduce((s, r) => s + r.current, 0) / total).toFixed(2)
    const maxCurrent = Math.max(...diagRecords.map(r => r.current)).toFixed(2)
    const minCurrent = Math.min(...diagRecords.map(r => r.current)).toFixed(2)

    const level = Number(normalRate) >= 85 ? '正常' : Number(normalRate) >= 60 ? '需关注' : '异常'
    const levelColor = level === '正常' ? '#52c41a' : level === '需关注' ? '#faad14' : '#ff4d4f'

    const conclusion = `${selectedWell.name} 在监测周期内共${total}次诊断记录，其中正常${normalCount}次（占比${normalRate}%），平均电流${avgCurrent}A，最大${maxCurrent}A，最小${minCurrent}A。`

    let suggestion = ''
    if (abnormals.length === 0) {
      suggestion = '电流信号运行平稳，各项指标正常，建议保持当前运行参数，定期监测。'
    } else {
      const typeDesc = sortedTypes.map(([t, c]) => `${t}${c}次`).join('，')
      const mainType = sortedTypes[0][0]
      suggestion = `异常记录${abnormals.length}次：${typeDesc}。主要问题为"${mainType}"，建议检查电机绝缘、负载工况及供电线路，必要时调整运行频率或安排检泵作业。`
    }

    return { conclusion, suggestion, level, levelColor }
  }, [selectedWell, diagRecords])

  const diagColumns = [
    { title: '序号', dataIndex: 'seq', key: 'seq', width: 50, align: 'center' as const },
    { title: '时间', dataIndex: 'time', key: 'time', width: 100 },
    { title: '泵电流(A)', dataIndex: 'current', key: 'current', width: 85, align: 'center' as const },
    { title: '诊断结果', dataIndex: 'result', key: 'result', width: 90,
      render: (v: string, r: DiagRecord) => <Tag color={r.resultColor} style={{ fontSize: 11, padding: '0 6px' }}>{v}</Tag>,
    },
  ]

  return (
    <div className="page-container" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top bar */}
      <Card bodyStyle={{ padding: '8px 16px' }} style={{ marginBottom: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Space size={12} wrap>
            <Space size={4}>
              <span style={{ fontWeight: 500, fontSize: 13 }}>电流日卡片日期：</span>
              <DatePicker value={dailyDate} onChange={v => v && setDailyDate(v)} size="small" allowClear={false} style={{ width: 130 }} />
            </Space>
            <Divider type="vertical" />
            <Space size={4}>
              <span style={{ fontWeight: 500, fontSize: 13 }}>电流周卡片区间：</span>
              <DatePicker value={weekStart} onChange={v => v && setWeekStart(v)} size="small" allowClear={false} style={{ width: 130 }} />
              <span style={{ color: '#999' }}>~</span>
              <DatePicker value={weekEnd} onChange={v => v && setWeekEnd(v)} size="small" allowClear={false} style={{ width: 130 }} />
            </Space>
          </Space>
        </div>
      </Card>

      {/* Main content: 3-column layout */}
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

        {/* Center: Charts area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'auto', minWidth: 0 }}>
          {!selectedWell ? (
            <Card style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description="请选择井" />
            </Card>
          ) : (
            <>
              {/* Two polar charts side by side */}
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Card size="small" bodyStyle={{ padding: '4px 8px' }} style={{ flex: 1 }}>
                  <ReactECharts option={dailyCardOption} style={{ height: 300 }} />
                </Card>
                <Card size="small" bodyStyle={{ padding: '4px 8px' }} style={{ flex: 1 }}>
                  <ReactECharts option={weeklyCardOption} style={{ height: 300 }} />
                </Card>
              </div>

              {/* Current trend chart */}
              <Card size="small" bodyStyle={{ padding: '4px 8px' }} style={{ flexShrink: 0 }}>
                <ReactECharts option={trendOption} style={{ height: 240 }} />
              </Card>
            </>
          )}
        </div>

        {/* Right: Diagnosis result table */}
        <Card
          size="small"
          title={<span style={{ fontSize: 12 }}>诊断结果</span>}
          bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
          style={{ width: 320, flexShrink: 0, overflow: 'hidden' }}
        >
          <Table
            className="signal-diag-table"
            columns={diagColumns}
            dataSource={diagRecords}
            rowKey="key"
            size="small"
            pagination={{ pageSize: 25, size: 'small', showTotal: (t, r) => `每页 ${r[1] - r[0] + 1} 条,共 ${t} 条` }}
            scroll={{ y: 'calc(100vh - 280px)' }}
            rowClassName={(r: DiagRecord) => r.result.includes('报警') || r.result.includes('异常') ? 'diag-row-alarm' : r.result.includes('偏') || r.result.includes('轻微') ? 'diag-row-warn' : ''}
          />
        </Card>
      </div>

      {/* Bottom: AI summary */}
      {currentSummary && (
        <Card size="small" style={{ marginTop: 8, flexShrink: 0 }} bodyStyle={{ padding: '8px 16px' }}
          title={
            <span style={{ fontSize: 12, color: '#1677ff', display: 'flex', alignItems: 'center', gap: 6 }}>
              <RobotOutlined style={{ fontSize: 14 }} /> AI 诊断结论与建议
            </span>
          }
        >
          <div style={{ fontSize: 12, lineHeight: 1.8, color: '#333' }}>
            <div style={{ marginBottom: 4 }}>
              <Tag color="#1677ff" style={{ fontWeight: 600, marginRight: 6 }}>诊断结论</Tag>
              {currentSummary.conclusion}
              <Tag color={currentSummary.levelColor} style={{ marginLeft: 6, fontWeight: 600 }}>{currentSummary.level}</Tag>
            </div>
            <div>
              <Tag color="#722ed1" style={{ fontWeight: 600, marginRight: 6 }}>建议措施</Tag>
              {currentSummary.suggestion}
            </div>
          </div>
        </Card>
      )}

      <style>{`
        .diag-row-alarm td { background: #fff1f0 !important; }
        .diag-row-warn td { background: #fffbe6 !important; }
        .signal-diag-table .ant-table-thead > tr > th {
          background: #e6f4ff !important;
          color: #1677ff;
          font-weight: 600;
          font-size: 12px;
        }
      `}</style>
    </div>
  )
}

export default CurrentSignalDiagnosis
