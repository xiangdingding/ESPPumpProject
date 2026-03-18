/**
 * Mock 数据：对应库表
 * - syn_fault_type_chart  多参规则图版
 * - syn_limit             多参系数界限表
 * - syn_weight            电泵井多参规则权重
 *
 * 若真实库表字段不同，请按 DDL 调整接口与字段名后替换本文件数据。
 */

// ==================== syn_fault_type_chart 多参规则图版 ====================

export interface SynFaultTypeChart {
  Chart_Id: string
  Fault_Type_Code: string
  Fault_Type_Name: string
  Chart_No: string
  Chart_Name: string
  X_Param_Code: string
  X_Param_Name: string
  Y_Param_Code: string
  Y_Param_Name: string
  Remark: string | null
  Enable_Flag: number
  Seq_No: number
}

/** SELECT * FROM syn_fault_type_chart */
export const synFaultTypeChartList: SynFaultTypeChart[] = [
  {
    Chart_Id: 'CHART001',
    Fault_Type_Code: 'C01',
    Fault_Type_Name: '气体影响',
    Chart_No: 'MP-01',
    Chart_Name: '电流波动-泵效图版',
    X_Param_Code: 'CURR_CV',
    X_Param_Name: '电流变异系数',
    Y_Param_Code: 'PUMP_EFF',
    Y_Param_Name: '泵效',
    Remark: '气影响典型区',
    Enable_Flag: 1,
    Seq_No: 1,
  },
  {
    Chart_Id: 'CHART002',
    Fault_Type_Code: 'C03',
    Fault_Type_Name: '稠油及乳化',
    Chart_No: 'MP-02',
    Chart_Name: '功率-日产液图版',
    X_Param_Code: 'POWER_KW',
    X_Param_Name: '轴功率',
    Y_Param_Code: 'LIQ_TD',
    Y_Param_Name: '日产液',
    Remark: '乳化黏度升高',
    Enable_Flag: 1,
    Seq_No: 2,
  },
  {
    Chart_Id: 'CHART003',
    Fault_Type_Code: 'C04',
    Fault_Type_Name: '叶轮磨损',
    Chart_No: 'MP-03',
    Chart_Name: '扬程-流量偏离图版',
    X_Param_Code: 'HEAD_RATIO',
    X_Param_Name: '实际扬程/额定扬程',
    Y_Param_Code: 'FLOW_RATIO',
    Y_Param_Name: '实际流量/额定流量',
    Remark: '磨损后特性线下移',
    Enable_Flag: 1,
    Seq_No: 3,
  },
  {
    Chart_Id: 'CHART004',
    Fault_Type_Code: 'C05',
    Fault_Type_Name: '供液不足',
    Chart_No: 'MP-04',
    Chart_Name: '沉没度-入口压力图版',
    X_Param_Code: 'SUBM_M',
    X_Param_Name: '沉没度(m)',
    Y_Param_Code: 'PIN_MPA',
    Y_Param_Name: '泵入口压力(MPa)',
    Remark: '供液不足区',
    Enable_Flag: 1,
    Seq_No: 4,
  },
  {
    Chart_Id: 'CHART005',
    Fault_Type_Code: 'C06',
    Fault_Type_Name: '正常运行',
    Chart_No: 'MP-05',
    Chart_Name: '综合健康区图版',
    X_Param_Code: 'VIB_MM',
    X_Param_Name: '振动(mm/s)',
    Y_Param_Code: 'MOT_TEMP',
    Y_Param_Name: '电机温度(℃)',
    Remark: '正常工况参考区',
    Enable_Flag: 1,
    Seq_No: 5,
  },
]

// ==================== syn_limit 多参系数界限表 ====================

export interface SynLimit {
  Limit_Id: string
  Chart_Id: string
  Param_Code: string
  Param_Name: string
  Limit_Type: string
  Coef_Min: number | null
  Coef_Max: number | null
  Unit: string | null
  Zone_Code: string
  Zone_Name: string
  Remark: string | null
  Seq_No: number
}

/** SELECT * FROM syn_limit */
export const synLimitList: SynLimit[] = [
  { Limit_Id: 'L001', Chart_Id: 'CHART001', Param_Code: 'CURR_CV', Param_Name: '电流变异系数', Limit_Type: '区间', Coef_Min: 0.12, Coef_Max: 0.45, Unit: null, Zone_Code: 'Z1', Zone_Name: '疑似气影响', Remark: null, Seq_No: 1 },
  { Limit_Id: 'L002', Chart_Id: 'CHART001', Param_Code: 'PUMP_EFF', Param_Name: '泵效', Limit_Type: '上限', Coef_Min: null, Coef_Max: 42, Unit: '%', Zone_Code: 'Z1', Zone_Name: '疑似气影响', Remark: null, Seq_No: 2 },
  { Limit_Id: 'L003', Chart_Id: 'CHART001', Param_Code: 'CURR_CV', Param_Name: '电流变异系数', Limit_Type: '区间', Coef_Min: 0.05, Coef_Max: 0.11, Unit: null, Zone_Code: 'Z0', Zone_Name: '正常参考', Remark: null, Seq_No: 3 },
  { Limit_Id: 'L004', Chart_Id: 'CHART002', Param_Code: 'POWER_KW', Param_Name: '轴功率', Limit_Type: '下限', Coef_Min: 1.15, Coef_Max: null, Unit: '倍额定', Zone_Code: 'Z1', Zone_Name: '高耗低效区', Remark: '相对额定功率倍数', Seq_No: 1 },
  { Limit_Id: 'L005', Chart_Id: 'CHART002', Param_Code: 'LIQ_TD', Param_Name: '日产液', Limit_Type: '上限', Coef_Min: null, Coef_Max: 0.75, Unit: '倍设计', Zone_Code: 'Z1', Zone_Name: '高耗低效区', Remark: null, Seq_No: 2 },
  { Limit_Id: 'L006', Chart_Id: 'CHART003', Param_Code: 'HEAD_RATIO', Param_Name: '扬程比', Limit_Type: '上限', Coef_Min: null, Coef_Max: 0.88, Unit: null, Zone_Code: 'Z1', Zone_Name: '磨损可疑', Remark: null, Seq_No: 1 },
  { Limit_Id: 'L007', Chart_Id: 'CHART003', Param_Code: 'FLOW_RATIO', Param_Name: '流量比', Limit_Type: '区间', Coef_Min: 0.92, Coef_Max: 1.08, Unit: null, Zone_Code: 'Z0', Zone_Name: '特性正常', Remark: null, Seq_No: 2 },
  { Limit_Id: 'L008', Chart_Id: 'CHART004', Param_Code: 'SUBM_M', Param_Name: '沉没度', Limit_Type: '上限', Coef_Min: null, Coef_Max: 80, Unit: 'm', Zone_Code: 'Z1', Zone_Name: '供液不足', Remark: null, Seq_No: 1 },
  { Limit_Id: 'L009', Chart_Id: 'CHART004', Param_Code: 'PIN_MPA', Param_Name: '泵入口压力', Limit_Type: '上限', Coef_Min: null, Coef_Max: 2.5, Unit: 'MPa', Zone_Code: 'Z1', Zone_Name: '供液不足', Remark: null, Seq_No: 2 },
  { Limit_Id: 'L010', Chart_Id: 'CHART005', Param_Code: 'VIB_MM', Param_Name: '振动', Limit_Type: '区间', Coef_Min: 0, Coef_Max: 4.5, Unit: 'mm/s', Zone_Code: 'Z0', Zone_Name: '健康区', Remark: null, Seq_No: 1 },
  { Limit_Id: 'L011', Chart_Id: 'CHART005', Param_Code: 'MOT_TEMP', Param_Name: '电机温度', Limit_Type: '区间', Coef_Min: 45, Coef_Max: 95, Unit: '℃', Zone_Code: 'Z0', Zone_Name: '健康区', Remark: null, Seq_No: 2 },
]

// ==================== syn_weight 电泵井多参规则权重 ====================

export interface SynWeight {
  Weight_Id: string
  Chart_Id: string
  Fault_Type_Code: string
  Param_Code: string
  Param_Name: string
  Rule_Weight: number
  Weight_Type: string
  Remark: string | null
  Seq_No: number
}

/** SELECT * FROM syn_weight */
export const synWeightList: SynWeight[] = [
  { Weight_Id: 'W001', Chart_Id: 'CHART001', Fault_Type_Code: 'C01', Param_Code: 'CURR_CV', Param_Name: '电流变异系数', Rule_Weight: 0.35, Weight_Type: '主判据', Remark: null, Seq_No: 1 },
  { Weight_Id: 'W002', Chart_Id: 'CHART001', Fault_Type_Code: 'C01', Param_Code: 'PUMP_EFF', Param_Name: '泵效', Rule_Weight: 0.28, Weight_Type: '主判据', Remark: null, Seq_No: 2 },
  { Weight_Id: 'W003', Chart_Id: 'CHART001', Fault_Type_Code: 'C01', Param_Code: 'GOR', Param_Name: '气油比', Rule_Weight: 0.22, Weight_Type: '辅判据', Remark: null, Seq_No: 3 },
  { Weight_Id: 'W004', Chart_Id: 'CHART001', Fault_Type_Code: 'C01', Param_Code: 'FREQ_HZ', Param_Name: '运行频率', Rule_Weight: 0.15, Weight_Type: '辅判据', Remark: null, Seq_No: 4 },
  { Weight_Id: 'W005', Chart_Id: 'CHART002', Fault_Type_Code: 'C03', Param_Code: 'POWER_KW', Param_Name: '轴功率', Rule_Weight: 0.32, Weight_Type: '主判据', Remark: null, Seq_No: 1 },
  { Weight_Id: 'W006', Chart_Id: 'CHART002', Fault_Type_Code: 'C03', Param_Code: 'LIQ_TD', Param_Name: '日产液', Rule_Weight: 0.28, Weight_Type: '主判据', Remark: null, Seq_No: 2 },
  { Weight_Id: 'W007', Chart_Id: 'CHART002', Fault_Type_Code: 'C03', Param_Code: 'WC_PCT', Param_Name: '含水率', Rule_Weight: 0.2, Weight_Type: '辅判据', Remark: null, Seq_No: 3 },
  { Weight_Id: 'W008', Chart_Id: 'CHART002', Fault_Type_Code: 'C03', Param_Code: 'VISC', Param_Name: '黏度指数', Rule_Weight: 0.2, Weight_Type: '辅判据', Remark: null, Seq_No: 4 },
  { Weight_Id: 'W009', Chart_Id: 'CHART003', Fault_Type_Code: 'C04', Param_Code: 'HEAD_RATIO', Param_Name: '扬程比', Rule_Weight: 0.4, Weight_Type: '主判据', Remark: null, Seq_No: 1 },
  { Weight_Id: 'W010', Chart_Id: 'CHART003', Fault_Type_Code: 'C04', Param_Code: 'FLOW_RATIO', Param_Name: '流量比', Rule_Weight: 0.35, Weight_Type: '主判据', Remark: null, Seq_No: 2 },
  { Weight_Id: 'W011', Chart_Id: 'CHART003', Fault_Type_Code: 'C04', Param_Code: 'PUMP_EFF', Param_Name: '泵效', Rule_Weight: 0.25, Weight_Type: '辅判据', Remark: null, Seq_No: 3 },
  { Weight_Id: 'W012', Chart_Id: 'CHART004', Fault_Type_Code: 'C05', Param_Code: 'SUBM_M', Param_Name: '沉没度', Rule_Weight: 0.38, Weight_Type: '主判据', Remark: null, Seq_No: 1 },
  { Weight_Id: 'W013', Chart_Id: 'CHART004', Fault_Type_Code: 'C05', Param_Code: 'PIN_MPA', Param_Name: '泵入口压力', Rule_Weight: 0.32, Weight_Type: '主判据', Remark: null, Seq_No: 2 },
  { Weight_Id: 'W014', Chart_Id: 'CHART004', Fault_Type_Code: 'C05', Param_Code: 'INTAKE_PSI', Param_Name: '入口压差', Rule_Weight: 0.3, Weight_Type: '辅判据', Remark: null, Seq_No: 3 },
  { Weight_Id: 'W015', Chart_Id: 'CHART005', Fault_Type_Code: 'C06', Param_Code: 'VIB_MM', Param_Name: '振动', Rule_Weight: 0.3, Weight_Type: '健康度', Remark: null, Seq_No: 1 },
  { Weight_Id: 'W016', Chart_Id: 'CHART005', Fault_Type_Code: 'C06', Param_Code: 'MOT_TEMP', Param_Name: '电机温度', Rule_Weight: 0.35, Weight_Type: '健康度', Remark: null, Seq_No: 2 },
  { Weight_Id: 'W017', Chart_Id: 'CHART005', Fault_Type_Code: 'C06', Param_Code: 'CURR_A', Param_Name: '运行电流', Rule_Weight: 0.2, Weight_Type: '健康度', Remark: null, Seq_No: 3 },
  { Weight_Id: 'W018', Chart_Id: 'CHART005', Fault_Type_Code: 'C06', Param_Code: 'PUMP_EFF', Param_Name: '泵效', Rule_Weight: 0.15, Weight_Type: '健康度', Remark: null, Seq_No: 4 },
]

export function getChartById(chartId: string): SynFaultTypeChart | undefined {
  return synFaultTypeChartList.find(c => c.Chart_Id === chartId)
}

export function getLimitsByChartId(chartId: string): SynLimit[] {
  return synLimitList.filter(l => l.Chart_Id === chartId)
}

export function getWeightsByChartId(chartId: string): SynWeight[] {
  return synWeightList.filter(w => w.Chart_Id === chartId)
}
