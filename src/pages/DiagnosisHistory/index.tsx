import React, { useState, useMemo, useCallback } from 'react'
import {
  Row, Col, Card, Statistic, Table, Tag, Badge, Select, DatePicker, Button, Space,
  Timeline, Modal, Descriptions, Tooltip, message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  SearchOutlined, ExportOutlined, CheckCircleOutlined, WarningOutlined,
  CloseCircleOutlined, FieldTimeOutlined, FundProjectionScreenOutlined,
  ClusterOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import {
  wellList, diagnosisRecords, workConditionTypes,
} from '../../mock/wellData'
import type { DiagnosisRecord } from '../../mock/wellData'

const { RangePicker } = DatePicker

const statusMap: Record<string, { text: string; color: string; badge: 'success' | 'warning' | 'error' }> = {
  normal: { text: '正常', color: '#52c41a', badge: 'success' },
  warning: { text: '预警', color: '#faad14', badge: 'warning' },
  alarm: { text: '报警', color: '#ff4d4f', badge: 'error' },
}

const diagnosisMethodList = ['综合诊断', '多参数综合', '电参数+多参数', '参数诊断', '振动分析', '电参数诊断']

// 生成近30天模拟诊断数据
const generateLast30DaysRecords = (): DiagnosisRecord[] => {
  const records: DiagnosisRecord[] = []
  const types = ['运行正常', '供液不足', '泵效过低', '电机过热', '振动异常', '气锁预警', '泵漏失', '结蜡']
  const statusWeights: Array<DiagnosisRecord['status']> = [
    'normal', 'normal', 'normal', 'normal', 'normal',
    'warning', 'warning', 'warning',
    'alarm',
  ]
  const methods = diagnosisMethodList
  const wells = wellList.filter(w => w.status !== 'offline')

  for (let d = 29; d >= 0; d--) {
    const date = dayjs().subtract(d, 'day')
    const dailyCount = 3 + Math.floor(Math.random() * 6)
    for (let i = 0; i < dailyCount; i++) {
      const well = wells[Math.floor(Math.random() * wells.length)]
      const status = statusWeights[Math.floor(Math.random() * statusWeights.length)]
      const type = status === 'normal' ? '运行正常' : types[1 + Math.floor(Math.random() * (types.length - 1))]
      const hour = Math.floor(Math.random() * 24)
      const minute = Math.floor(Math.random() * 60)
      records.push({
        id: `DH-${d}-${i}`,
        wellId: well.id,
        wellName: well.name,
        time: date.hour(hour).minute(minute).format('YYYY-MM-DD HH:mm'),
        type,
        status,
        description: `${well.name} ${type}诊断记录`,
        parameters: {
          efficiency: Math.round((20 + Math.random() * 40) * 10) / 10,
          current: Math.round((18 + Math.random() * 22) * 10) / 10,
          temperature: Math.round(65 + Math.random() * 45),
          vibration: Math.round((1 + Math.random() * 7) * 10) / 10,
        },
        diagnosisMethod: methods[Math.floor(Math.random() * methods.length)],
      })
    }
  }

  return [...records, ...diagnosisRecords].sort((a, b) =>
    dayjs(b.time).valueOf() - dayjs(a.time).valueOf()
  )
}

const allRecords = generateLast30DaysRecords()

const DiagnosisHistory: React.FC = () => {
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [selectedWells, setSelectedWells] = useState<string[]>([])
  const [selectedType, setSelectedType] = useState<string | undefined>(undefined)
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(undefined)
  const [selectedMethod, setSelectedMethod] = useState<string | undefined>(undefined)
  const [selectedWellForTimeline, setSelectedWellForTimeline] = useState<string | undefined>(undefined)
  const [detailRecord, setDetailRecord] = useState<DiagnosisRecord | null>(null)
  const [detailVisible, setDetailVisible] = useState(false)

  const filteredRecords = useMemo(() => {
    return allRecords.filter(r => {
      if (dateRange && dateRange[0] && dateRange[1]) {
        const t = dayjs(r.time)
        if (t.isBefore(dateRange[0].startOf('day')) || t.isAfter(dateRange[1].endOf('day'))) return false
      }
      if (selectedWells.length > 0 && !selectedWells.includes(r.wellId)) return false
      if (selectedType && r.type !== selectedType) return false
      if (selectedStatus && r.status !== selectedStatus) return false
      if (selectedMethod && r.diagnosisMethod !== selectedMethod) return false
      return true
    })
  }, [dateRange, selectedWells, selectedType, selectedStatus, selectedMethod])

  const stats = useMemo(() => {
    const total = filteredRecords.length
    const normal = filteredRecords.filter(r => r.status === 'normal').length
    const warning = filteredRecords.filter(r => r.status === 'warning').length
    const alarm = filteredRecords.filter(r => r.status === 'alarm').length
    const coveredWells = new Set(filteredRecords.map(r => r.wellId)).size
    return { total, normal, warning, alarm, coveredWells }
  }, [filteredRecords])

  // 近30天每天的诊断统计
  const trendOption = useMemo(() => {
    const days: string[] = []
    const normalCounts: number[] = []
    const warningCounts: number[] = []
    const alarmCounts: number[] = []

    for (let d = 29; d >= 0; d--) {
      const date = dayjs().subtract(d, 'day')
      const dateStr = date.format('MM-DD')
      days.push(dateStr)
      const dayRecords = filteredRecords.filter(r =>
        dayjs(r.time).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
      )
      normalCounts.push(dayRecords.filter(r => r.status === 'normal').length)
      warningCounts.push(dayRecords.filter(r => r.status === 'warning').length)
      alarmCounts.push(dayRecords.filter(r => r.status === 'alarm').length)
    }

    return {
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      legend: { data: ['正常', '预警', '报警'], top: 4, right: 20 },
      grid: { left: 50, right: 20, top: 40, bottom: 30 },
      xAxis: { type: 'category' as const, data: days, axisLabel: { rotate: 45, fontSize: 11 } },
      yAxis: { type: 'value' as const, name: '诊断次数', minInterval: 1 },
      series: [
        { name: '正常', type: 'bar' as const, stack: 'total', data: normalCounts, itemStyle: { color: '#52c41a' }, barMaxWidth: 20 },
        { name: '预警', type: 'bar' as const, stack: 'total', data: warningCounts, itemStyle: { color: '#faad14' }, barMaxWidth: 20 },
        { name: '报警', type: 'bar' as const, stack: 'total', data: alarmCounts, itemStyle: { color: '#ff4d4f' }, barMaxWidth: 20 },
      ],
    }
  }, [filteredRecords])

  // 工况类型分布饼图
  const typePieOption = useMemo(() => {
    const typeCount: Record<string, number> = {}
    filteredRecords.forEach(r => {
      typeCount[r.type] = (typeCount[r.type] || 0) + 1
    })
    const data = Object.entries(typeCount)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    const colors = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16']

    return {
      tooltip: { trigger: 'item' as const, formatter: '{b}: {c}次 ({d}%)' },
      legend: { orient: 'vertical' as const, right: 10, top: 'center' as const, textStyle: { fontSize: 12 } },
      series: [{
        type: 'pie' as const,
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        label: { show: false },
        emphasis: { label: { show: true, fontSize: 14, fontWeight: 'bold' as const } },
        data: data.map((d, i) => ({ ...d, itemStyle: { color: colors[i % colors.length] } })),
      }],
    }
  }, [filteredRecords])

  // 各井报警次数排名
  const alarmRankOption = useMemo(() => {
    const wellAlarmCount: Record<string, { name: string; count: number }> = {}
    filteredRecords
      .filter(r => r.status === 'alarm' || r.status === 'warning')
      .forEach(r => {
        if (!wellAlarmCount[r.wellId]) {
          wellAlarmCount[r.wellId] = { name: r.wellName, count: 0 }
        }
        wellAlarmCount[r.wellId].count++
      })

    const sorted = Object.values(wellAlarmCount)
      .sort((a, b) => a.count - b.count)
      .slice(-10)

    return {
      tooltip: { trigger: 'axis' as const, axisPointer: { type: 'shadow' as const } },
      grid: { left: 100, right: 30, top: 10, bottom: 20 },
      xAxis: { type: 'value' as const, minInterval: 1 },
      yAxis: { type: 'category' as const, data: sorted.map(s => s.name), axisLabel: { fontSize: 12 } },
      series: [{
        type: 'bar' as const,
        data: sorted.map(s => ({
          value: s.count,
          itemStyle: {
            color: s.count >= 10 ? '#ff4d4f' : s.count >= 5 ? '#faad14' : '#1677ff',
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barMaxWidth: 18,
        label: { show: true, position: 'right' as const, fontSize: 12 },
      }],
    }
  }, [filteredRecords])

  // 单井时间线数据
  const timelineData = useMemo(() => {
    if (!selectedWellForTimeline) return []
    return filteredRecords
      .filter(r => r.wellId === selectedWellForTimeline)
      .slice(0, 20)
  }, [filteredRecords, selectedWellForTimeline])

  const diagnosisTypes = useMemo(() => {
    const types = new Set(allRecords.map(r => r.type))
    return Array.from(types)
  }, [])

  const handleExport = useCallback(() => {
    message.success('诊断记录导出成功（模拟）')
  }, [])

  const handleReset = useCallback(() => {
    setDateRange(null)
    setSelectedWells([])
    setSelectedType(undefined)
    setSelectedStatus(undefined)
    setSelectedMethod(undefined)
  }, [])

  const columns: ColumnsType<DiagnosisRecord> = [
    {
      title: '时间',
      dataIndex: 'time',
      key: 'time',
      width: 160,
      sorter: (a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf(),
      defaultSortOrder: 'descend',
      render: (t: string) => <span style={{ fontSize: 13, color: '#555' }}>{t}</span>,
    },
    {
      title: '井名',
      dataIndex: 'wellName',
      key: 'wellName',
      width: 120,
      render: (name: string) => <span style={{ fontWeight: 500 }}>{name}</span>,
    },
    {
      title: '诊断类型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      filters: diagnosisTypes.map(t => ({ text: t, value: t })),
      onFilter: (value, record) => record.type === value,
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          '运行正常': 'green', '供液不足': 'orange', '泵效过低': 'red',
          '电机过热': 'volcano', '振动异常': 'purple', '气锁预警': 'magenta',
          '泵漏失': 'gold', '结蜡': 'cyan',
        }
        return <Tag color={colorMap[type] || 'default'}>{type}</Tag>
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      filters: [
        { text: '正常', value: 'normal' },
        { text: '预警', value: 'warning' },
        { text: '报警', value: 'alarm' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (status: DiagnosisRecord['status']) => (
        <Badge status={statusMap[status].badge} text={statusMap[status].text} />
      ),
    },
    {
      title: '诊断方法',
      dataIndex: 'diagnosisMethod',
      key: 'diagnosisMethod',
      width: 130,
      render: (m: string) => <span style={{ color: '#666' }}>{m || '-'}</span>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '关键参数',
      key: 'parameters',
      width: 200,
      render: (_: unknown, record: DiagnosisRecord) => {
        const params = record.parameters
        const entries = Object.entries(params).slice(0, 3)
        return (
          <Space size={4} wrap>
            {entries.map(([k, v]) => (
              <Tooltip key={k} title={`${k}: ${v}`}>
                <Tag style={{ fontSize: 11, margin: 0 }}>{k}: {v}</Tag>
              </Tooltip>
            ))}
          </Space>
        )
      },
    },
  ]

  const expandedRowRender = (record: DiagnosisRecord) => (
    <Descriptions size="small" column={4} bordered>
      {Object.entries(record.parameters).map(([key, value]) => (
        <Descriptions.Item key={key} label={key}>{value}</Descriptions.Item>
      ))}
      <Descriptions.Item label="诊断方法">{record.diagnosisMethod || '-'}</Descriptions.Item>
      <Descriptions.Item label="诊断时间">{record.time}</Descriptions.Item>
      <Descriptions.Item label="描述" span={2}>{record.description}</Descriptions.Item>
    </Descriptions>
  )

  const statCards = [
    { title: '总诊断次数', value: stats.total, icon: <FundProjectionScreenOutlined />, color: '#1677ff' },
    { title: '正常次数', value: stats.normal, icon: <CheckCircleOutlined />, color: '#52c41a' },
    { title: '预警次数', value: stats.warning, icon: <WarningOutlined />, color: '#faad14' },
    { title: '报警次数', value: stats.alarm, icon: <CloseCircleOutlined />, color: '#ff4d4f' },
    { title: '诊断覆盖井数', value: stats.coveredWells, icon: <ClusterOutlined />, color: '#722ed1', suffix: '口' },
  ]

  return (
    <div className="page-container" style={{ padding: 20, background: '#f0f2f5', minHeight: '100%' }}>
      {/* 筛选区 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap size={[12, 12]}>
          <RangePicker
            value={dateRange as [Dayjs, Dayjs] | null}
            onChange={(val) => setDateRange(val as [Dayjs | null, Dayjs | null] | null)}
            style={{ width: 260 }}
            placeholder={['开始日期', '结束日期']}
          />
          <Select
            mode="multiple"
            placeholder="选择井（可多选）"
            value={selectedWells}
            onChange={setSelectedWells}
            style={{ minWidth: 220 }}
            maxTagCount={2}
            allowClear
            options={wellList.map(w => ({ label: w.name, value: w.id }))}
          />
          <Select
            placeholder="诊断类型"
            value={selectedType}
            onChange={setSelectedType}
            style={{ width: 140 }}
            allowClear
            options={diagnosisTypes.map(t => ({ label: t, value: t }))}
          />
          <Select
            placeholder="状态筛选"
            value={selectedStatus}
            onChange={setSelectedStatus}
            style={{ width: 120 }}
            allowClear
            options={[
              { label: '全部', value: '' },
              { label: '正常', value: 'normal' },
              { label: '预警', value: 'warning' },
              { label: '报警', value: 'alarm' },
            ]}
          />
          <Select
            placeholder="诊断方法"
            value={selectedMethod}
            onChange={setSelectedMethod}
            style={{ width: 150 }}
            allowClear
            options={diagnosisMethodList.map(m => ({ label: m, value: m }))}
          />
          <Button type="primary" icon={<SearchOutlined />} onClick={handleReset}>
            重置
          </Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>
            导出
          </Button>
        </Space>
      </Card>

      {/* 统计概览 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        {statCards.map((item) => (
          <Col key={item.title} xs={24} sm={12} md={8} lg={4} xl={4} style={{ marginBottom: 8 }}>
            <Card
              size="small"
              style={{ borderTop: `3px solid ${item.color}` }}
              bodyStyle={{ padding: '16px 20px' }}
            >
              <Statistic
                title={<span style={{ fontSize: 13, color: '#888' }}>{item.title}</span>}
                value={item.value}
                suffix={item.suffix}
                valueStyle={{ color: item.color, fontSize: 28, fontWeight: 600 }}
                prefix={<span style={{ fontSize: 20, marginRight: 6 }}>{item.icon}</span>}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* 趋势图 + 饼图 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={16}>
          <Card
            title={<span><FieldTimeOutlined style={{ marginRight: 8 }} />诊断趋势（近30天）</span>}
            size="small"
            bodyStyle={{ padding: '8px 12px' }}
          >
            <ReactECharts option={trendOption} style={{ height: 320 }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title="工况类型分布"
            size="small"
            bodyStyle={{ padding: '8px 12px' }}
          >
            <ReactECharts option={typePieOption} style={{ height: 320 }} />
          </Card>
        </Col>
      </Row>

      {/* 明细表格 */}
      <Card
        title="诊断记录明细"
        size="small"
        style={{ marginBottom: 16 }}
        bodyStyle={{ padding: '0 12px 12px' }}
      >
        <Table<DiagnosisRecord>
          dataSource={filteredRecords}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
          expandable={{ expandedRowRender }}
          onRow={(record) => ({
            onClick: () => { setDetailRecord(record); setDetailVisible(true) },
            style: { cursor: 'pointer' },
          })}
          scroll={{ x: 1000 }}
        />
      </Card>

      {/* 时间线 + 报警排名 */}
      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card
            title="单井诊断时间线"
            size="small"
            extra={
              <Select
                placeholder="选择井"
                value={selectedWellForTimeline}
                onChange={setSelectedWellForTimeline}
                style={{ width: 180 }}
                allowClear
                options={wellList.filter(w => w.status !== 'offline').map(w => ({ label: w.name, value: w.id }))}
              />
            }
            bodyStyle={{ padding: '16px 20px', maxHeight: 420, overflow: 'auto' }}
          >
            {!selectedWellForTimeline ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 60 }}>
                请选择一口井查看诊断时间线
              </div>
            ) : timelineData.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#999', padding: 60 }}>
                该井暂无诊断记录
              </div>
            ) : (
              <Timeline
                items={timelineData.map(r => ({
                  color: statusMap[r.status].color,
                  children: (
                    <div
                      style={{ cursor: 'pointer' }}
                      onClick={() => { setDetailRecord(r); setDetailVisible(true) }}
                    >
                      <div style={{ fontSize: 12, color: '#999', marginBottom: 2 }}>{r.time}</div>
                      <div style={{ fontWeight: 500 }}>
                        <Tag
                          color={r.status === 'normal' ? 'green' : r.status === 'warning' ? 'orange' : 'red'}
                          style={{ marginRight: 6 }}
                        >
                          {statusMap[r.status].text}
                        </Tag>
                        {r.type}
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{r.description}</div>
                    </div>
                  ),
                }))}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title="报警/预警次数排名"
            size="small"
            bodyStyle={{ padding: '8px 12px' }}
          >
            <ReactECharts option={alarmRankOption} style={{ height: 380 }} />
          </Card>
        </Col>
      </Row>

      {/* 详情弹窗 */}
      <Modal
        title="诊断记录详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={null}
        width={680}
      >
        {detailRecord && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="井名">{detailRecord.wellName}</Descriptions.Item>
            <Descriptions.Item label="诊断时间">{detailRecord.time}</Descriptions.Item>
            <Descriptions.Item label="诊断类型">
              <Tag color={detailRecord.status === 'normal' ? 'green' : detailRecord.status === 'warning' ? 'orange' : 'red'}>
                {detailRecord.type}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="状态">
              <Badge status={statusMap[detailRecord.status].badge} text={statusMap[detailRecord.status].text} />
            </Descriptions.Item>
            <Descriptions.Item label="诊断方法">{detailRecord.diagnosisMethod || '-'}</Descriptions.Item>
            <Descriptions.Item label="井号">{detailRecord.wellId}</Descriptions.Item>
            <Descriptions.Item label="描述" span={2}>{detailRecord.description}</Descriptions.Item>
            {Object.entries(detailRecord.parameters).map(([key, value]) => (
              <Descriptions.Item key={key} label={key}>{value}</Descriptions.Item>
            ))}
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default DiagnosisHistory
