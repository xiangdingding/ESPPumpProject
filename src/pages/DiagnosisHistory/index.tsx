import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Card, Tag, Badge, Select, DatePicker, Button, Space, Table, Statistic,
  Timeline, Modal, Descriptions, Input, Empty, message, Tabs,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  SearchOutlined, ExportOutlined, CheckCircleOutlined, WarningOutlined,
  CloseCircleOutlined, ClusterOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { assignWellStatus, generateWellParams } from '../../mock/wellData'
import type { WellInfo, DiagnosisRecord } from '../../mock/wellData'
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
const badgeMap: Record<string, 'success' | 'warning' | 'error'> = {
  normal: 'success', warning: 'warning', alarm: 'error',
}
const diagMethods = ['综合诊断', '多参数综合', '电参数+多参数', '参数诊断', '振动分析', '电参数诊断']
const faultTypes = ['运行正常', '供液不足', '气体影响', '泵效过低', '电机过热', '振动异常', '气锁', '管柱漏失', '泵反转', '出砂']

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

function genHistoryRecords(wells: Map<string, WellInfo>, days: number): DiagnosisRecord[] {
  const records: DiagnosisRecord[] = []
  const wellArr = Array.from(wells.values()).filter(w => w.status !== 'offline')
  if (wellArr.length === 0) return records

  for (let d = days - 1; d >= 0; d--) {
    const date = dayjs().subtract(d, 'day')
    const count = 2 + Math.floor(seededRand(d * 17) * 5)
    for (let i = 0; i < count; i++) {
      const well = wellArr[Math.floor(seededRand(d * 100 + i * 7) * wellArr.length)]
      const seed = d * 1000 + i
      const r = seededRand(seed)
      let status: 'normal' | 'warning' | 'alarm'
      if (well.status === 'alarm') {
        status = r < 0.2 ? 'normal' : r < 0.5 ? 'warning' : 'alarm'
      } else if (well.status === 'warning') {
        status = r < 0.4 ? 'normal' : r < 0.8 ? 'warning' : 'alarm'
      } else {
        status = r < 0.8 ? 'normal' : r < 0.95 ? 'warning' : 'alarm'
      }
      const type = status === 'normal' ? '运行正常' : faultTypes[1 + Math.floor(seededRand(seed + 3) * (faultTypes.length - 1))]
      const hour = Math.floor(seededRand(seed + 5) * 24)
      const minute = Math.floor(seededRand(seed + 7) * 60)
      const method = diagMethods[Math.floor(seededRand(seed + 11) * diagMethods.length)]
      records.push({
        id: `DH-${d}-${i}`,
        wellId: well.id,
        wellName: well.name,
        time: date.hour(hour).minute(minute).format('YYYY-MM-DD HH:mm'),
        type,
        status,
        description: status === 'normal'
          ? `${well.name} 各项参数正常，设备运行稳定`
          : `${well.name} 检测到${type}，${status === 'alarm' ? '建议立即处理' : '建议持续关注'}`,
        parameters: {
          efficiency: Math.round((20 + seededRand(seed + 13) * 40) * 10) / 10,
          current: Math.round((well.current + (seededRand(seed + 17) - 0.5) * 10) * 10) / 10,
          temperature: Math.round(well.temperature + (seededRand(seed + 19) - 0.5) * 20),
          vibration: Math.round((1 + seededRand(seed + 23) * 7) * 10) / 10,
        },
        diagnosisMethod: method,
      })
    }
  }
  return records.sort((a, b) => dayjs(b.time).valueOf() - dayjs(a.time).valueOf())
}

const DiagnosisHistory: React.FC = () => {
  const { selectedOrg, filteredDbWells } = useOrgContext()
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null)
  const [wellSearch, setWellSearch] = useState('')
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([dayjs().subtract(30, 'day'), dayjs()])
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined)
  const [filterType, setFilterType] = useState<string | undefined>(undefined)
  const [filterMethod, setFilterMethod] = useState<string | undefined>(undefined)
  const [detailRecord, setDetailRecord] = useState<DiagnosisRecord | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)
  const [activeTab, setActiveTab] = useState('table')

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

  const allRecords = useMemo(() => genHistoryRecords(convertedMap, 60), [convertedMap])

  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
      if (selectedWellId && r.wellId !== selectedWellId) return false
      const t = dayjs(r.time)
      if (t.isBefore(dateRange[0].startOf('day')) || t.isAfter(dateRange[1].endOf('day'))) return false
      if (filterStatus && r.status !== filterStatus) return false
      if (filterType && r.type !== filterType) return false
      if (filterMethod && r.diagnosisMethod !== filterMethod) return false
      return true
    })
  }, [allRecords, selectedWellId, dateRange, filterStatus, filterType, filterMethod])

  const stats = useMemo(() => {
    const total = filteredRecords.length
    const normal = filteredRecords.filter(r => r.status === 'normal').length
    const warning = filteredRecords.filter(r => r.status === 'warning').length
    const alarm = filteredRecords.filter(r => r.status === 'alarm').length
    const wells = new Set(filteredRecords.map(r => r.wellId)).size
    return { total, normal, warning, alarm, wells }
  }, [filteredRecords])

  const trendOption = useMemo(() => {
    const days = dateRange[1].diff(dateRange[0], 'day') + 1
    const dates: string[] = []
    const normalC: number[] = []
    const warningC: number[] = []
    const alarmC: number[] = []
    for (let d = 0; d < days; d++) {
      const date = dateRange[0].add(d, 'day')
      dates.push(date.format('MM-DD'))
      const dayRecs = filteredRecords.filter(r => dayjs(r.time).format('YYYY-MM-DD') === date.format('YYYY-MM-DD'))
      normalC.push(dayRecs.filter(r => r.status === 'normal').length)
      warningC.push(dayRecs.filter(r => r.status === 'warning').length)
      alarmC.push(dayRecs.filter(r => r.status === 'alarm').length)
    }
    return {
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      legend: { data: ['正常', '预警', '报警'], top: 0, right: 10, textStyle: { fontSize: 11 } },
      grid: { left: 45, right: 15, top: 30, bottom: 30 },
      xAxis: { type: 'category' as const, data: dates, axisLabel: { rotate: 40, fontSize: 10 } },
      yAxis: { type: 'value' as const, name: '次数', minInterval: 1, axisLabel: { fontSize: 10 } },
      series: [
        { name: '正常', type: 'bar' as const, stack: 'total', data: normalC, itemStyle: { color: '#52c41a' }, barMaxWidth: 16 },
        { name: '预警', type: 'bar' as const, stack: 'total', data: warningC, itemStyle: { color: '#faad14' }, barMaxWidth: 16 },
        { name: '报警', type: 'bar' as const, stack: 'total', data: alarmC, itemStyle: { color: '#ff4d4f' }, barMaxWidth: 16 },
      ],
    }
  }, [filteredRecords, dateRange])

  const typePieOption = useMemo(() => {
    const typeCount: Record<string, number> = {}
    filteredRecords.forEach(r => { typeCount[r.type] = (typeCount[r.type] || 0) + 1 })
    const data = Object.entries(typeCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    const colors = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911']
    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c}次 ({d}%)' },
      legend: { orient: 'vertical' as const, right: 5, top: 'center' as const, textStyle: { fontSize: 11 } },
      series: [{
        type: 'pie' as const, radius: ['38%', '68%'], center: ['38%', '50%'],
        itemStyle: { borderRadius: 5, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 12, fontWeight: 'bold' as const } },
        data: data.map((d, i) => ({ ...d, itemStyle: { color: colors[i % colors.length] } })),
      }],
    }
  }, [filteredRecords])

  const alarmRankOption = useMemo(() => {
    const wellCount: Record<string, { name: string; alarm: number; warning: number }> = {}
    filteredRecords.filter(r => r.status !== 'normal').forEach(r => {
      if (!wellCount[r.wellId]) wellCount[r.wellId] = { name: r.wellName, alarm: 0, warning: 0 }
      if (r.status === 'alarm') wellCount[r.wellId].alarm++
      else wellCount[r.wellId].warning++
    })
    const sorted = Object.values(wellCount).sort((a, b) => (a.alarm + a.warning) - (b.alarm + b.warning)).slice(-8)
    return {
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      legend: { data: ['报警', '预警'], top: 0, right: 10, textStyle: { fontSize: 11 } },
      grid: { left: 80, right: 20, top: 28, bottom: 10 },
      xAxis: { type: 'value' as const, minInterval: 1, axisLabel: { fontSize: 10 } },
      yAxis: { type: 'category' as const, data: sorted.map(s => s.name), axisLabel: { fontSize: 11 } },
      series: [
        { name: '报警', type: 'bar' as const, stack: 'total', data: sorted.map(s => s.alarm), itemStyle: { color: '#ff4d4f', borderRadius: [0, 3, 3, 0] }, barMaxWidth: 14 },
        { name: '预警', type: 'bar' as const, stack: 'total', data: sorted.map(s => s.warning), itemStyle: { color: '#faad14', borderRadius: [0, 3, 3, 0] }, barMaxWidth: 14 },
      ],
    }
  }, [filteredRecords])

  const timelineData = useMemo(() => {
    if (!selectedWellId) return []
    return allRecords.filter(r => r.wellId === selectedWellId).slice(0, 30)
  }, [allRecords, selectedWellId])

  const handleExport = useCallback(() => { message.success('诊断记录导出成功（模拟）') }, [])
  const handleReset = useCallback(() => {
    setDateRange([dayjs().subtract(30, 'day'), dayjs()])
    setFilterStatus(undefined)
    setFilterType(undefined)
    setFilterMethod(undefined)
  }, [])

  const columns: ColumnsType<DiagnosisRecord> = [
    { title: '时间', dataIndex: 'time', key: 'time', width: 140, sorter: (a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf(), defaultSortOrder: 'descend',
      render: (t: string) => <span style={{ fontSize: 12, color: '#555' }}>{t}</span>,
    },
    { title: '井名', dataIndex: 'wellName', key: 'wellName', width: 100, render: (n: string) => <span style={{ fontWeight: 500 }}>{n}</span> },
    { title: '诊断类型', dataIndex: 'type', key: 'type', width: 100,
      render: (type: string) => {
        const cm: Record<string, string> = { '运行正常': 'green', '供液不足': 'orange', '气体影响': 'gold', '泵效过低': 'red', '电机过热': 'volcano', '振动异常': 'purple', '气锁': 'magenta', '管柱漏失': 'cyan', '泵反转': 'blue', '出砂': 'lime' }
        return <Tag color={cm[type] || 'default'} style={{ fontSize: 11 }}>{type}</Tag>
      },
    },
    { title: '状态', dataIndex: 'status', key: 'status', width: 80,
      render: (s: 'normal' | 'warning' | 'alarm') => <Badge status={badgeMap[s]} text={statusTextMap[s] || s} />,
    },
    { title: '诊断方法', dataIndex: 'diagnosisMethod', key: 'diagnosisMethod', width: 110, render: (m: string) => <span style={{ color: '#666', fontSize: 12 }}>{m}</span> },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: '操作', key: 'action', width: 60, align: 'center' as const,
      render: (_: unknown, record: DiagnosisRecord) => (
        <a style={{ fontSize: 12 }} onClick={(e) => { e.stopPropagation(); setDetailRecord(record); setDetailVisible(true) }}>详情</a>
      ),
    },
  ]

  const statItems = [
    { label: '总诊断', value: stats.total, color: '#1677ff', icon: <ClusterOutlined /> },
    { label: '正常', value: stats.normal, color: '#52c41a', icon: <CheckCircleOutlined /> },
    { label: '预警', value: stats.warning, color: '#faad14', icon: <WarningOutlined /> },
    { label: '报警', value: stats.alarm, color: '#ff4d4f', icon: <CloseCircleOutlined /> },
  ]

  return (
    <div className="page-container" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top: filter + stats */}
      <Card bodyStyle={{ padding: '8px 16px' }} style={{ marginBottom: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Space size={8} wrap>
            <RangePicker value={dateRange} onChange={v => { if (v?.[0] && v?.[1]) setDateRange([v[0], v[1]]) }}
              size="small" style={{ width: 240 }} allowClear={false} />
            <Select placeholder="状态" value={filterStatus} onChange={setFilterStatus} size="small" style={{ width: 90 }} allowClear
              options={[{ label: '正常', value: 'normal' }, { label: '预警', value: 'warning' }, { label: '报警', value: 'alarm' }]} />
            <Select placeholder="诊断类型" value={filterType} onChange={setFilterType} size="small" style={{ width: 110 }} allowClear
              options={faultTypes.map(t => ({ label: t, value: t }))} />
            <Select placeholder="诊断方法" value={filterMethod} onChange={setFilterMethod} size="small" style={{ width: 120 }} allowClear
              options={diagMethods.map(m => ({ label: m, value: m }))} />
            <Button size="small" onClick={handleReset}>重置</Button>
            <Button size="small" icon={<ExportOutlined />} onClick={handleExport}>导出</Button>
          </Space>
          <Space size={16}>
            {statItems.map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: '#8c8c8c' }}>{s.icon} {s.label}</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: s.color, lineHeight: 1.3 }}>{s.value}</div>
              </div>
            ))}
          </Space>
        </div>
      </Card>

      {/* Main layout */}
      <div style={{ flex: 1, display: 'flex', gap: 8, overflow: 'hidden', minHeight: 0 }}>
        {/* Left: Well list */}
        <Card
          bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
          style={{ width: 200, flexShrink: 0, overflow: 'hidden' }}
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

        {/* Center: main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', minWidth: 0 }}>
          {/* Charts row */}
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <Card size="small" title={<span style={{ fontSize: 12 }}>诊断趋势</span>} bodyStyle={{ padding: '4px 8px' }} style={{ flex: 3 }}>
              <ReactECharts option={trendOption} style={{ height: 200 }} />
            </Card>
            <Card size="small" title={<span style={{ fontSize: 12 }}>工况类型分布</span>} bodyStyle={{ padding: '4px 8px' }} style={{ flex: 2 }}>
              <ReactECharts option={typePieOption} style={{ height: 200 }} />
            </Card>
          </div>

          {/* Bottom: table / timeline tabs */}
          <Card
            size="small"
            bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            <Tabs activeKey={activeTab} onChange={setActiveTab} size="small"
              style={{ padding: '0 12px' }}
              items={[
                { key: 'table', label: `诊断记录 (${filteredRecords.length})`,
                  children: (
                    <div style={{ overflow: 'auto', padding: '0 0 8px' }}>
                      <Table<DiagnosisRecord>
                        dataSource={filteredRecords}
                        columns={columns}
                        rowKey="id"
                        size="small"
                        pagination={{ pageSize: 15, size: 'small', showTotal: t => `共 ${t} 条` }}
                        scroll={{ x: 800 }}
                        onRow={record => ({ onClick: () => { setDetailRecord(record); setDetailVisible(true) }, style: { cursor: 'pointer' } })}
                        rowClassName={(r) => r.status === 'alarm' ? 'diag-row-alarm' : r.status === 'warning' ? 'diag-row-warn' : ''}
                      />
                    </div>
                  ),
                },
                { key: 'timeline', label: `${selectedWell?.name || '单井'}诊断时间线`,
                  children: (
                    <div style={{ overflow: 'auto', padding: '12px 16px', maxHeight: 400 }}>
                      {timelineData.length === 0 ? (
                        <Empty description="暂无诊断记录" style={{ padding: 40 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
                      ) : (
                        <Timeline
                          items={timelineData.map(r => ({
                            color: r.status === 'alarm' ? '#ff4d4f' : r.status === 'warning' ? '#faad14' : '#52c41a',
                            children: (
                              <div style={{ cursor: 'pointer' }} onClick={() => { setDetailRecord(r); setDetailVisible(true) }}>
                                <div style={{ fontSize: 11, color: '#999', marginBottom: 2 }}>{r.time}</div>
                                <div style={{ fontWeight: 500, fontSize: 13 }}>
                                  <Tag color={r.status === 'alarm' ? 'red' : r.status === 'warning' ? 'orange' : 'green'} style={{ fontSize: 11, marginRight: 6 }}>
                                    {statusTextMap[r.status]}
                                  </Tag>
                                  {r.type}
                                  <span style={{ fontSize: 11, color: '#999', marginLeft: 8 }}>{r.diagnosisMethod}</span>
                                </div>
                                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{r.description}</div>
                              </div>
                            ),
                          }))}
                        />
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </div>

        {/* Right: alarm ranking */}
        <Card
          size="small"
          title={<span style={{ fontSize: 12 }}>报警/预警排名</span>}
          bodyStyle={{ padding: '4px 8px', display: 'flex', flexDirection: 'column', height: '100%' }}
          style={{ width: 280, flexShrink: 0 }}
        >
          <ReactECharts option={alarmRankOption} style={{ height: '100%', minHeight: 300 }} />
        </Card>
      </div>

      {/* Detail modal */}
      <Modal title="诊断记录详情" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={640}>
        {detailRecord && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="井名">{detailRecord.wellName}</Descriptions.Item>
            <Descriptions.Item label="诊断时间">{detailRecord.time}</Descriptions.Item>
            <Descriptions.Item label="诊断类型">
              <Tag color={detailRecord.status === 'alarm' ? 'red' : detailRecord.status === 'warning' ? 'orange' : 'green'}>{detailRecord.type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态"><Badge status={badgeMap[detailRecord.status]} text={statusTextMap[detailRecord.status]} /></Descriptions.Item>
            <Descriptions.Item label="诊断方法">{detailRecord.diagnosisMethod || '-'}</Descriptions.Item>
            <Descriptions.Item label="井号">{detailRecord.wellId}</Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>{detailRecord.description}</Descriptions.Item>
            <Descriptions.Item label="泵效">{detailRecord.parameters.efficiency}%</Descriptions.Item>
            <Descriptions.Item label="电流">{detailRecord.parameters.current} A</Descriptions.Item>
            <Descriptions.Item label="温度">{detailRecord.parameters.temperature} ℃</Descriptions.Item>
            <Descriptions.Item label="振动">{detailRecord.parameters.vibration} mm/s</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <style>{`
        .diag-row-alarm td { background: #fff1f0 !important; }
        .diag-row-warn td { background: #fffbe6 !important; }
      `}</style>
    </div>
  )
}

export default DiagnosisHistory
