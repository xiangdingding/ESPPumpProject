import React, { useState, useMemo, useCallback } from 'react'
import {
  Card, Select, Row, Col, Statistic, Tag, Button, Descriptions, List, Space, Divider, message, Tooltip,
} from 'antd'
import {
  ReloadOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  CloseCircleOutlined,
  RiseOutlined,
  FallOutlined,
  AreaChartOutlined,
} from '@ant-design/icons'
import ReactECharts from 'echarts-for-react'
import {
  wellList,
  generateDynagraphData,
  workConditionTypes,
  diagnosisRecords,
} from '../../mock/wellData'
import type { DynagraphData, DynagraphPoint } from '../../mock/wellData'

const severityColorMap: Record<string, string> = {
  info: '#52c41a',
  warning: '#faad14',
  danger: '#ff4d4f',
}

const severityBgMap: Record<string, string> = {
  info: '#f6ffed',
  warning: '#fffbe6',
  danger: '#fff2f0',
}

const severityBorderMap: Record<string, string> = {
  info: '#b7eb8f',
  warning: '#ffe58f',
  danger: '#ffccc7',
}

const severityLabelMap: Record<string, string> = {
  info: '正常',
  warning: '警告',
  danger: '严重',
}

const severityIconMap: Record<string, React.ReactNode> = {
  info: <CheckCircleOutlined />,
  warning: <WarningOutlined />,
  danger: <CloseCircleOutlined />,
}

const calcCardArea = (points: DynagraphPoint[]): number => {
  if (points.length < 3) return 0
  let area = 0
  for (let i = 0; i < points.length - 1; i++) {
    area += points[i].displacement * points[i + 1].load - points[i + 1].displacement * points[i].load
  }
  area += points[points.length - 1].displacement * points[0].load - points[0].displacement * points[points.length - 1].load
  return Math.abs(area) / 2
}

const DynagraphDiagnosis: React.FC = () => {
  const [selectedWellId, setSelectedWellId] = useState(wellList[0].id)
  const [dynData, setDynData] = useState<DynagraphData>(() => generateDynagraphData(wellList[0].id))
  const [historyData, setHistoryData] = useState<DynagraphData[]>(() => {
    const arr: DynagraphData[] = []
    for (let i = 0; i < 3; i++) {
      arr.push(generateDynagraphData(wellList[0].id))
    }
    return arr
  })
  const [diagnosing, setDiagnosing] = useState(false)

  const handleWellChange = useCallback((wellId: string) => {
    setSelectedWellId(wellId)
    const data = generateDynagraphData(wellId)
    setDynData(data)
    const hist: DynagraphData[] = []
    for (let i = 0; i < 3; i++) hist.push(generateDynagraphData(wellId))
    setHistoryData(hist)
  }, [])

  const handleCollect = useCallback(() => {
    const data = generateDynagraphData(selectedWellId)
    setDynData(data)
    message.success('数据采集完成')
  }, [selectedWellId])

  const handleDiagnose = useCallback(() => {
    setDiagnosing(true)
    setTimeout(() => {
      setDiagnosing(false)
      message.success('自动诊断完成')
    }, 1500)
  }, [])

  const matchedCondition = useMemo(
    () => workConditionTypes.find(w => w.code === dynData.workConditionCode),
    [dynData.workConditionCode],
  )

  const severity = matchedCondition?.severity ?? 'info'
  const cardArea = useMemo(() => calcCardArea(dynData.surfaceCard), [dynData.surfaceCard])
  const pumpCardArea = useMemo(() => calcCardArea(dynData.pumpCard), [dynData.pumpCard])

  const maxLoadPoint = useMemo(() => {
    let max = dynData.surfaceCard[0]
    dynData.surfaceCard.forEach(p => { if (p.load > max.load) max = p })
    return max
  }, [dynData.surfaceCard])

  const minLoadPoint = useMemo(() => {
    let min = dynData.surfaceCard[0]
    dynData.surfaceCard.forEach(p => { if (p.load < min.load) min = p })
    return min
  }, [dynData.surfaceCard])

  const surfaceCardOption = useMemo(() => ({
    title: { text: '地面示功图', left: 'center', textStyle: { fontSize: 14, color: '#333' } },
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = params[0]
        return `位移: ${p.data[0].toFixed(2)} m<br/>载荷: ${p.data[1].toFixed(1)} kN`
      },
    },
    grid: { top: 50, right: 30, bottom: 50, left: 60 },
    xAxis: { type: 'value' as const, name: '位移 (m)', min: 0, nameTextStyle: { color: '#666' }, axisLine: { lineStyle: { color: '#ccc' } }, axisLabel: { color: '#666' } },
    yAxis: { type: 'value' as const, name: '载荷 (kN)', nameTextStyle: { color: '#666' }, axisLine: { lineStyle: { color: '#ccc' } }, axisLabel: { color: '#666' } },
    series: [
      {
        type: 'line',
        data: dynData.surfaceCard.map(p => [p.displacement, p.load]),
        smooth: false,
        areaStyle: { opacity: 0.15, color: '#1677ff' },
        lineStyle: { width: 2, color: '#1677ff' },
        itemStyle: { color: '#1677ff' },
        symbol: 'none',
      },
      {
        type: 'scatter',
        data: [[maxLoadPoint.displacement, maxLoadPoint.load]],
        symbol: 'pin',
        symbolSize: 36,
        itemStyle: { color: '#ff4d4f' },
        label: { show: true, formatter: `最大 ${maxLoadPoint.load.toFixed(1)}kN`, position: 'top', fontSize: 11, color: '#ff4d4f' },
      },
      {
        type: 'scatter',
        data: [[minLoadPoint.displacement, minLoadPoint.load]],
        symbol: 'pin',
        symbolSize: 36,
        itemStyle: { color: '#52c41a' },
        label: { show: true, formatter: `最小 ${minLoadPoint.load.toFixed(1)}kN`, position: 'bottom', fontSize: 11, color: '#52c41a' },
      },
    ],
  }), [dynData.surfaceCard, maxLoadPoint, minLoadPoint])

  const pumpCardOption = useMemo(() => ({
    title: { text: '泵功图', left: 'center', textStyle: { fontSize: 14, color: '#333' } },
    tooltip: {
      trigger: 'axis' as const,
      formatter: (params: any) => {
        const p = params[0]
        return `位移: ${p.data[0].toFixed(2)} m<br/>载荷: ${p.data[1].toFixed(1)} kN`
      },
    },
    grid: { top: 50, right: 30, bottom: 50, left: 60 },
    xAxis: { type: 'value' as const, name: '位移 (m)', min: 0, nameTextStyle: { color: '#666' }, axisLine: { lineStyle: { color: '#ccc' } }, axisLabel: { color: '#666' } },
    yAxis: { type: 'value' as const, name: '载荷 (kN)', nameTextStyle: { color: '#666' }, axisLine: { lineStyle: { color: '#ccc' } }, axisLabel: { color: '#666' } },
    series: [{
      type: 'line',
      data: dynData.pumpCard.map(p => [p.displacement, p.load]),
      smooth: false,
      areaStyle: { opacity: 0.15, color: '#52c41a' },
      lineStyle: { width: 2, color: '#52c41a' },
      itemStyle: { color: '#52c41a' },
      symbol: 'none',
    }],
  }), [dynData.pumpCard])

  const overlayOption = useMemo(() => ({
    title: { text: '功图叠加对比', left: 'center', textStyle: { fontSize: 14, color: '#333' } },
    tooltip: { trigger: 'axis' as const },
    legend: { data: ['地面功图', '泵功图'], bottom: 5 },
    grid: { top: 50, right: 30, bottom: 50, left: 60 },
    xAxis: { type: 'value' as const, name: '位移 (m)', min: 0, nameTextStyle: { color: '#666' }, axisLine: { lineStyle: { color: '#ccc' } }, axisLabel: { color: '#666' } },
    yAxis: { type: 'value' as const, name: '载荷 (kN)', nameTextStyle: { color: '#666' }, axisLine: { lineStyle: { color: '#ccc' } }, axisLabel: { color: '#666' } },
    series: [
      {
        name: '地面功图',
        type: 'line',
        data: dynData.surfaceCard.map(p => [p.displacement, p.load]),
        smooth: false,
        areaStyle: { opacity: 0.1, color: '#1677ff' },
        lineStyle: { width: 2, color: '#1677ff' },
        itemStyle: { color: '#1677ff' },
        symbol: 'none',
      },
      {
        name: '泵功图',
        type: 'line',
        data: dynData.pumpCard.map(p => [p.displacement, p.load]),
        smooth: false,
        areaStyle: { opacity: 0.1, color: '#52c41a' },
        lineStyle: { width: 2, color: '#52c41a' },
        itemStyle: { color: '#52c41a' },
        symbol: 'none',
      },
    ],
  }), [dynData.surfaceCard, dynData.pumpCard])

  const historyThumbnailOption = useCallback((data: DynagraphData, idx: number) => ({
    title: { text: `#${idx + 1} ${data.workCondition}`, left: 'center', textStyle: { fontSize: 11, color: '#666' } },
    grid: { top: 30, right: 10, bottom: 25, left: 35 },
    xAxis: { type: 'value' as const, min: 0, axisLabel: { show: false }, axisLine: { lineStyle: { color: '#ddd' } }, splitLine: { show: false } },
    yAxis: { type: 'value' as const, axisLabel: { fontSize: 9, color: '#999' }, axisLine: { lineStyle: { color: '#ddd' } }, splitLine: { lineStyle: { color: '#f0f0f0' } } },
    series: [{
      type: 'line',
      data: data.surfaceCard.map(p => [p.displacement, p.load]),
      smooth: false,
      areaStyle: { opacity: 0.12, color: '#1677ff' },
      lineStyle: { width: 1.5, color: '#1677ff' },
      symbol: 'none',
    }],
  }), [])

  const trendOption = useMemo(() => {
    const labels = historyData.map((_, i) => `采集 ${i + 1}`)
    return {
      title: { text: '功图参数趋势', left: 'center', textStyle: { fontSize: 14, color: '#333' } },
      tooltip: { trigger: 'axis' as const },
      legend: { data: ['最大载荷', '最小载荷', '功图面积'], bottom: 5 },
      grid: { top: 50, right: 30, bottom: 50, left: 60 },
      xAxis: { type: 'category' as const, data: [...labels, '当前'], axisLine: { lineStyle: { color: '#ccc' } }, axisLabel: { color: '#666' } },
      yAxis: { type: 'value' as const, axisLine: { lineStyle: { color: '#ccc' } }, axisLabel: { color: '#666' } },
      series: [
        {
          name: '最大载荷',
          type: 'line',
          data: [...historyData.map(d => d.maxLoad), dynData.maxLoad],
          lineStyle: { color: '#ff4d4f' },
          itemStyle: { color: '#ff4d4f' },
        },
        {
          name: '最小载荷',
          type: 'line',
          data: [...historyData.map(d => d.minLoad), dynData.minLoad],
          lineStyle: { color: '#52c41a' },
          itemStyle: { color: '#52c41a' },
        },
        {
          name: '功图面积',
          type: 'line',
          data: [...historyData.map(d => Math.round(calcCardArea(d.surfaceCard) * 10) / 10), Math.round(cardArea * 10) / 10],
          lineStyle: { color: '#1677ff' },
          itemStyle: { color: '#1677ff' },
          yAxisIndex: 0,
        },
      ],
    }
  }, [historyData, dynData, cardArea])

  const relatedRecords = useMemo(
    () => diagnosisRecords.filter(r => r.wellId === selectedWellId).slice(0, 5),
    [selectedWellId],
  )

  return (
    <div className="page-container" style={{ padding: 20, background: '#f0f2f5', minHeight: '100%' }}>
      {/* 顶部工具栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row align="middle" gutter={16}>
          <Col>
            <Space>
              <span style={{ fontWeight: 600, color: '#333' }}>选择井：</span>
              <Select
                value={selectedWellId}
                onChange={handleWellChange}
                style={{ width: 200 }}
                showSearch
                optionFilterProp="label"
                options={wellList.map(w => ({ value: w.id, label: `${w.name} (${w.id})` }))}
              />
            </Space>
          </Col>
          <Col>
            <Space>
              <span style={{ color: '#999' }}>采集时间：</span>
              <span style={{ fontWeight: 500 }}>{dynData.time}</span>
            </Space>
          </Col>
          <Col flex="auto" style={{ textAlign: 'right' }}>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleCollect}>手动采集</Button>
              <Button type="primary" icon={<ThunderboltOutlined />} loading={diagnosing} onClick={handleDiagnose}>自动诊断</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 主体区域 */}
      <Row gutter={16}>
        {/* 左侧图表区 */}
        <Col xs={24} lg={16}>
          <Card size="small" style={{ marginBottom: 16 }} bodyStyle={{ padding: 12 }}>
            <ReactECharts option={surfaceCardOption} style={{ height: 400 }} />
          </Card>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Card size="small" style={{ marginBottom: 16 }} bodyStyle={{ padding: 12 }}>
                <ReactECharts option={pumpCardOption} style={{ height: 350 }} />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card size="small" style={{ marginBottom: 16 }} bodyStyle={{ padding: 12 }}>
                <ReactECharts option={overlayOption} style={{ height: 350 }} />
              </Card>
            </Col>
          </Row>
        </Col>

        {/* 右侧面板 */}
        <Col xs={24} lg={8}>
          {/* 诊断结果 */}
          <Card
            size="small"
            style={{
              marginBottom: 16,
              border: `1px solid ${severityBorderMap[severity]}`,
              background: severityBgMap[severity],
            }}
          >
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <div style={{ fontSize: 16, color: '#666', marginBottom: 8 }}>诊断结果</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: severityColorMap[severity], marginBottom: 8 }}>
                {severityIconMap[severity]} {dynData.workCondition}
              </div>
              <Tag color={severity === 'info' ? 'success' : severity === 'warning' ? 'warning' : 'error'}>
                {severityLabelMap[severity]}
              </Tag>
            </div>
          </Card>

          {/* 功图参数 */}
          <Card size="small" title={<><AreaChartOutlined /> 功图参数</>} style={{ marginBottom: 16 }}>
            <Descriptions column={2} size="small" labelStyle={{ color: '#888' }}>
              <Descriptions.Item label="冲程">{dynData.strokeLength} m</Descriptions.Item>
              <Descriptions.Item label="冲次">{dynData.strokeFrequency} 次/min</Descriptions.Item>
              <Descriptions.Item label="最大载荷">
                <span style={{ color: '#ff4d4f', fontWeight: 600 }}>{dynData.maxLoad} kN</span>
              </Descriptions.Item>
              <Descriptions.Item label="最小载荷">
                <span style={{ color: '#52c41a', fontWeight: 600 }}>{dynData.minLoad} kN</span>
              </Descriptions.Item>
              <Descriptions.Item label="载荷差">
                {(dynData.maxLoad - dynData.minLoad).toFixed(1)} kN
              </Descriptions.Item>
              <Descriptions.Item label="功图面积">
                {cardArea.toFixed(1)} kN·m
              </Descriptions.Item>
              <Descriptions.Item label="泵功图面积">
                {pumpCardArea.toFixed(1)} kN·m
              </Descriptions.Item>
              <Descriptions.Item label="面积比">
                {cardArea > 0 ? (pumpCardArea / cardArea * 100).toFixed(1) : 0}%
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* 泵效和产量 */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="泵效"
                  value={dynData.pumpEfficiency}
                  suffix="%"
                  valueStyle={{ color: dynData.pumpEfficiency >= 40 ? '#52c41a' : dynData.pumpEfficiency >= 25 ? '#faad14' : '#ff4d4f', fontSize: 24 }}
                  prefix={dynData.pumpEfficiency >= 40 ? <RiseOutlined /> : <FallOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="日产液量"
                  value={dynData.liquidProduction}
                  suffix="t/d"
                  valueStyle={{ color: '#1677ff', fontSize: 24 }}
                />
              </Col>
            </Row>
          </Card>

          {/* 工况特征 */}
          {matchedCondition && (
            <Card size="small" title="工况特征" style={{ marginBottom: 16 }}>
              <div style={{ marginBottom: 8, color: '#666', fontSize: 13 }}>
                {matchedCondition.mechanism}
              </div>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ fontWeight: 600, marginBottom: 6, fontSize: 13 }}>特征表现：</div>
              <List
                size="small"
                dataSource={matchedCondition.features}
                renderItem={item => (
                  <List.Item style={{ padding: '4px 0', border: 'none' }}>
                    <Tag color="blue" style={{ marginRight: 4 }}>•</Tag>
                    <span style={{ fontSize: 12, color: '#555' }}>{item}</span>
                  </List.Item>
                )}
              />
            </Card>
          )}

          {/* 处理建议 */}
          {matchedCondition && (
            <Card size="small" title="处理建议" style={{ marginBottom: 16 }}>
              <List
                size="small"
                dataSource={matchedCondition.suggestions}
                renderItem={(item, idx) => (
                  <List.Item style={{ padding: '4px 0', border: 'none' }}>
                    <Tag color="orange">{idx + 1}</Tag>
                    <span style={{ fontSize: 12, color: '#555' }}>{item}</span>
                  </List.Item>
                )}
              />
            </Card>
          )}

          {/* 近期诊断记录 */}
          {relatedRecords.length > 0 && (
            <Card size="small" title="近期诊断记录" style={{ marginBottom: 16 }}>
              <List
                size="small"
                dataSource={relatedRecords}
                renderItem={r => (
                  <List.Item style={{ padding: '6px 0' }}>
                    <div style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Tag color={r.status === 'normal' ? 'success' : r.status === 'warning' ? 'warning' : 'error'}>
                          {r.type}
                        </Tag>
                        <span style={{ fontSize: 11, color: '#999' }}>{r.time}</span>
                      </div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{r.description}</div>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          )}
        </Col>
      </Row>

      {/* 下方区域 */}
      <Row gutter={16}>
        <Col xs={24} lg={14}>
          <Card size="small" title="历史功图对比" style={{ marginBottom: 16 }}>
            <Row gutter={12}>
              {historyData.map((hd, idx) => (
                <Col key={idx} xs={24} sm={8}>
                  <Tooltip title="点击查看详情">
                    <div
                      style={{ cursor: 'pointer', border: '1px solid #f0f0f0', borderRadius: 6, padding: 4, marginBottom: 8 }}
                      onClick={() => { setDynData(hd); message.info(`已切换到历史功图 #${idx + 1}`) }}
                    >
                      <ReactECharts option={historyThumbnailOption(hd, idx)} style={{ height: 180 }} />
                      <div style={{ textAlign: 'center', fontSize: 11, color: '#999', paddingBottom: 4 }}>
                        {hd.time}
                      </div>
                    </div>
                  </Tooltip>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card size="small" style={{ marginBottom: 16 }} bodyStyle={{ padding: 12 }}>
            <ReactECharts option={trendOption} style={{ height: 250 }} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default DynagraphDiagnosis
