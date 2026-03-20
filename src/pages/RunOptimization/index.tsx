import React, { useState, useMemo, useEffect, useRef } from 'react'
import { Card, Tag, Badge, DatePicker, Button, Space, Table, Input, Empty, message, Tooltip } from 'antd'
import { SearchOutlined, ExportOutlined, LeftOutlined, RightOutlined, ThunderboltOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import { assignWellStatus, generateWellParams } from '../../mock/wellData'
import type { WellInfo } from '../../mock/wellData'
import type { DbWell } from '../../mock/wellDbData'
import { useOrgContext } from '../../contexts/OrgContext'
import { fetchOptExecs, STATUS_LABELS, STATUS_COLORS } from '../../api/optExecApi'
import type { OptExecDTO } from '../../api/optExecApi'

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

interface WellRow {
  key: string
  name: string
  date: string
  dailyLiquid: number
  oilPressure: number
  backPressure: number
  chokeSize: number
  frequency: number
  pumpOutletPressure: number
  pumpInletPressure: number
  wellheadTemp: number
  pumpCurrent: number
  pumpVoltage: number
  prodHours: number
  pumpEfficiency: number
  optScheme: string
}

function genWellRow(w: WellInfo, dateStr: string): WellRow {
  const seed = w.id.charCodeAt(0) * 7 + w.id.charCodeAt(w.id.length - 1)
  const r = seededRand(seed)
  return {
    key: w.id, name: w.name, date: dateStr,
    dailyLiquid: w.dailyLiquid,
    oilPressure: Math.round((0.6 + r * 1.2) * 100) / 100,
    backPressure: Math.round(((0.6 + r * 1.2) * (0.6 + seededRand(seed + 1) * 0.5)) * 100) / 100,
    chokeSize: Math.round((5 + seededRand(seed + 2) * 12) * 10) / 10,
    frequency: w.frequency,
    pumpOutletPressure: Math.round((10 + seededRand(seed + 3) * 10) * 100) / 100,
    pumpInletPressure: Math.round((3 + seededRand(seed + 4) * 8) * 100) / 100,
    wellheadTemp: Math.round(40 + seededRand(seed + 5) * 40),
    pumpCurrent: w.current, pumpVoltage: w.voltage,
    prodHours: 24,
    pumpEfficiency: w.efficiency,
    optScheme: '生产调优化',
  }
}

const RunOptimization: React.FC = () => {
  const navigate = useNavigate()
  const { selectedOrg, filteredDbWells } = useOrgContext()
  const [selectedWellId, setSelectedWellId] = useState<string | null>(null)
  const [wellSearch, setWellSearch] = useState('')
  const [queryDate, setQueryDate] = useState<Dayjs>(dayjs())
  const [execMap, setExecMap] = useState<Map<string, OptExecDTO>>(new Map())

  useEffect(() => {
    fetchOptExecs().then(data => {
      const map = new Map<string, OptExecDTO>()
      for (const e of data) {
        if (e.status !== 'cancelled') {
          const existing = map.get(e.well_id)
          if (!existing || new Date(e.confirmed_at) > new Date(existing.confirmed_at)) {
            map.set(e.well_id, e)
          }
        }
      }
      setExecMap(map)
    }).catch(() => {})
  }, [])

  const convertedMap = useMemo(() => {
    const map = new Map<string, WellInfo>()
    filteredDbWells.forEach(dbw => { const w = convertDbWell(dbw); map.set(w.id, w) })
    return map
  }, [filteredDbWells])

  const activeWells = useMemo(() => Array.from(convertedMap.values()).filter(w => w.status !== 'offline'), [convertedMap])
  const needOptWells = useMemo(() => {
    const statusOrder: Record<string, number> = { alarm: 0, warning: 1, normal: 2, offline: 3 }
    return [...activeWells.filter(w => w.workConditionCode === 'C06')]
      .sort((a, b) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9))
  }, [activeWells])

  const filteredOptWells = useMemo(() => {
    if (!wellSearch.trim()) return needOptWells
    const kw = wellSearch.trim().toLowerCase()
    return needOptWells.filter(w => w.name.toLowerCase().includes(kw) || w.id.toLowerCase().includes(kw))
  }, [needOptWells, wellSearch])

  const tableRef = useRef<HTMLDivElement>(null)
  const [tableScrollY, setTableScrollY] = useState<number>(400)

  useEffect(() => {
    setWellSearch('')
    if (needOptWells.length > 0) setSelectedWellId(needOptWells[0].id)
    else setSelectedWellId(null)
  }, [filteredDbWells])

  useEffect(() => {
    const el = tableRef.current
    if (!el) return
    const calc = () => {
      const cardHead = el.querySelector('.ant-card-head') as HTMLElement | null
      const headH = cardHead?.offsetHeight || 38
      const available = el.offsetHeight - headH - 2
      if (available > 100) setTableScrollY(available)
    }
    calc()
    const ro = new ResizeObserver(calc)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleSelectWell = (wellId: string) => {
    setSelectedWellId(wellId)
    requestAnimationFrame(() => {
      const row = tableRef.current?.querySelector(`tr[data-row-key="${wellId}"]`) as HTMLElement | null
      row?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
  }

  const dateStr = queryDate.format('YYYY-MM-DD')
  const tableData = useMemo(() => needOptWells.map(w => genWellRow(w, dateStr)), [needOptWells, dateStr])

  const orgName = selectedOrg?.name || 'CNPCIC'

  const mainColumns = [
    { title: '序号', key: 'idx', width: 50, align: 'center' as const, fixed: 'left' as const,
      render: (_: any, __: any, i: number) => <span style={{ color: '#999' }}>{i + 1}</span> },
    { title: '井号', dataIndex: 'name', key: 'name', width: 110, ellipsis: true, fixed: 'left' as const,
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span> },
    { title: '日期', dataIndex: 'date', key: 'date', width: 95, fixed: 'left' as const },
    { title: '日产液量(m³)', dataIndex: 'dailyLiquid', key: 'dl', width: 95, align: 'center' as const,
      sorter: (a: WellRow, b: WellRow) => a.dailyLiquid - b.dailyLiquid },
    { title: '油压(MPa)', dataIndex: 'oilPressure', key: 'op', width: 80, align: 'center' as const },
    { title: '回压(MPa)', dataIndex: 'backPressure', key: 'bp', width: 80, align: 'center' as const },
    { title: '油嘴开度(mm)', dataIndex: 'chokeSize', key: 'cs', width: 95, align: 'center' as const },
    { title: '泵频率(Hz)', dataIndex: 'frequency', key: 'freq', width: 80, align: 'center' as const },
    { title: '泵出口压力(MPa)', dataIndex: 'pumpOutletPressure', key: 'pop', width: 115, align: 'center' as const },
    { title: '泵入口压力(MPa)', dataIndex: 'pumpInletPressure', key: 'pip', width: 115, align: 'center' as const },
    { title: '井口温度(°C)', dataIndex: 'wellheadTemp', key: 'wt', width: 90, align: 'center' as const },
    { title: '泵电流(A)', dataIndex: 'pumpCurrent', key: 'pc', width: 80, align: 'center' as const },
    { title: '泵电压(V)', dataIndex: 'pumpVoltage', key: 'pv', width: 80, align: 'center' as const },
    { title: '产时(h)', dataIndex: 'prodHours', key: 'ph', width: 65, align: 'center' as const },
    { title: '泵效率(%)', dataIndex: 'pumpEfficiency', key: 'pe', width: 80, align: 'center' as const,
      sorter: (a: WellRow, b: WellRow) => a.pumpEfficiency - b.pumpEfficiency,
      render: (v: number) => {
        const color = v >= 60 ? '#52c41a' : v >= 40 ? '#faad14' : '#ff4d4f'
        return <span style={{ color, fontWeight: 500 }}>{v}</span>
      },
    },
    { title: '执行状态', key: 'execStatus', width: 90, align: 'center' as const, fixed: 'right' as const,
      render: (_: any, row: WellRow) => {
        const exec = execMap.get(row.key)
        if (!exec) return <span style={{ color: '#bbb', fontSize: 11 }}>未确认</span>
        return (
          <Tooltip title={`${exec.scheme_type} ${exec.confirmed_at}`}>
            <Tag color={STATUS_COLORS[exec.status]} style={{ fontSize: 10, margin: 0 }}>
              {STATUS_LABELS[exec.status]}
            </Tag>
          </Tooltip>
        )
      },
    },
    { title: '操作', key: 'action', width: 110, align: 'center' as const, fixed: 'right' as const,
      render: (_: any, row: WellRow) => {
        const exec = execMap.get(row.key)
        return (
          <Space size={2}>
            <Button
              size="small" type="link" icon={<ThunderboltOutlined />}
              style={{ fontSize: 11, padding: '0 4px' }}
              onClick={() => navigate('/production-optimization', { state: { wellId: row.key } })}
            >优化</Button>
            {exec && (
              <Tooltip title={`${exec.scheme_type} ${STATUS_LABELS[exec.status]} ${exec.confirmed_at}`}>
                <CheckCircleOutlined style={{ color: STATUS_COLORS[exec.status], fontSize: 13 }} />
              </Tooltip>
            )}
          </Space>
        )
      },
    },
  ]

  return (
    <div className="page-container" style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Card bodyStyle={{ padding: '6px 16px' }} style={{ marginBottom: 8, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Space size={8}>
            <span style={{ fontWeight: 500, fontSize: 13 }}>查询日期：</span>
            <Button size="small" icon={<LeftOutlined />} onClick={() => setQueryDate(p => p.add(-1, 'day'))} />
            <DatePicker value={queryDate} onChange={v => v && setQueryDate(v)} size="small" allowClear={false} style={{ width: 130 }} />
            <Button size="small" icon={<RightOutlined />} onClick={() => setQueryDate(p => p.add(1, 'day'))} />
            <Button type="primary" size="small" icon={<SearchOutlined />}>查询</Button>
            <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>
              需优化 <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{needOptWells.length}</span> 口井
            </span>
          </Space>
          <Button size="small" icon={<ExportOutlined />} onClick={() => message.success('数据已导出')}>导出数据</Button>
        </div>
      </Card>

      <div style={{ flex: 1, display: 'flex', gap: 8, overflow: 'hidden', minHeight: 0 }}>
        <Card
          bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', height: '100%' }}
          style={{ width: 160, flexShrink: 0, overflow: 'hidden' }}
          size="small"
          title={<span style={{ fontSize: 12 }}>需优化井 {selectedOrg && <Tag color="blue" style={{ fontSize: 10 }}>{selectedOrg.name}</Tag>}</span>}
        >
          <div style={{ padding: '6px 8px', borderBottom: '1px solid #f0f0f0' }}>
            <Input placeholder="搜索井号..." prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={wellSearch} onChange={e => setWellSearch(e.target.value)} allowClear size="small" style={{ fontSize: 12 }} />
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {filteredOptWells.length === 0 ? (
              <Empty description="暂无需优化井" style={{ padding: 16 }} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              filteredOptWells.map(w => {
                const isSel = w.id === selectedWellId
                return (
                  <div key={w.id} onClick={() => handleSelectWell(w.id)}
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
                        {w.name}
                      </div>
                      <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                        {diagnosisTypeMap[w.workConditionCode] || '异常'}
                      </div>
                    </div>
                    <Badge status={statusColorMap[w.status]} text={statusTextMap[w.status]} />
                  </div>
                )
              })
            )}
          </div>
        </Card>

        <div ref={tableRef} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: 0 }}>
          <Card size="small" bodyStyle={{ padding: 0 }}
            style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
            title={<span style={{ fontSize: 12, color: '#1677ff' }}>{orgName} 需优化井列表（共 {tableData.length} 口）</span>}
          >
            <Table<WellRow>
              className="opt-main-table"
              columns={mainColumns}
              dataSource={tableData}
              rowKey="key"
              size="small"
              pagination={false}
              scroll={{ x: 1800, y: tableScrollY }}
              onRow={(record) => ({
                onDoubleClick: () => navigate('/production-optimization', { state: { wellId: record.key } }),
                onClick: () => handleSelectWell(record.key),
                style: { cursor: 'pointer', background: record.key === selectedWellId ? '#e6f4ff' : undefined },
              })}
            />
          </Card>
        </div>
      </div>

      <style>{`
        .opt-main-table .ant-table-thead > tr > th {
          background: #e6f4ff !important;
          color: #1677ff;
          font-weight: 600;
          font-size: 12px;
          white-space: nowrap;
        }
        .opt-main-table .ant-table-tbody > tr > td {
          font-size: 12px;
        }
        .opt-main-table .ant-table-tbody > tr:hover > td {
          background: #f0f7ff !important;
        }
        .opt-main-table .ant-table-cell-fix-left,
        .opt-main-table .ant-table-cell-fix-right {
          z-index: 1;
        }
        .opt-main-table .ant-table-thead .ant-table-cell-fix-left,
        .opt-main-table .ant-table-thead .ant-table-cell-fix-right {
          z-index: 3;
        }
      `}</style>
    </div>
  )
}

export default RunOptimization
