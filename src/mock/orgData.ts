// 组织机构数据 - 从数据库同步
// 生成时间: 2026-03-17T06:46:07.456Z

export interface OrgNode {
  Org_Id: string
  Org_Name: string
  Org_Type: string | null
  Parent_Id: string
  Seq_No: number
  Commission_Date: string | null
  Reservoir_Type: string | null
  Remarks: string | null
}

// 计算组织层级
export function getOrgLevel(org: OrgNode): number {
  return org.Org_Id.length / 2
}

export const orgList: OrgNode[] = [
  {
    "Org_Id": "05",
    "Org_Name": "CNPCIC",
    "Org_Type": null,
    "Parent_Id": "",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "0502",
    "Org_Name": "PSA Blocks",
    "Org_Type": null,
    "Parent_Id": "05",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050201",
    "Org_Name": "EEA2",
    "Org_Type": null,
    "Parent_Id": "0502",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05020101",
    "Org_Name": "Phoenix S",
    "Org_Type": null,
    "Parent_Id": "050201",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05020102",
    "Org_Name": "Mimosa S",
    "Org_Type": null,
    "Parent_Id": "050201",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05020103",
    "Org_Name": "Ronier S",
    "Org_Type": null,
    "Parent_Id": "050201",
    "Seq_No": 3,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05020104",
    "Org_Name": "Delo",
    "Org_Type": null,
    "Parent_Id": "050201",
    "Seq_No": 4,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050202",
    "Org_Name": "EEA1",
    "Org_Type": null,
    "Parent_Id": "0502",
    "Seq_No": 0,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05020201",
    "Org_Name": "Baobab C2",
    "Org_Type": null,
    "Parent_Id": "050202",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05020202",
    "Org_Name": "Baobab C3",
    "Org_Type": null,
    "Parent_Id": "050202",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05020203",
    "Org_Name": "Cassia N",
    "Org_Type": null,
    "Parent_Id": "050202",
    "Seq_No": 3,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "0503",
    "Org_Name": "H Blocks",
    "Org_Type": null,
    "Parent_Id": "05",
    "Seq_No": 0,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050301",
    "Org_Name": "Ronier",
    "Org_Type": null,
    "Parent_Id": "0503",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030101",
    "Org_Name": "Ronier 1",
    "Org_Type": null,
    "Parent_Id": "050301",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030102",
    "Org_Name": "Ronier 4",
    "Org_Type": null,
    "Parent_Id": "050301",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030103",
    "Org_Name": "Ronier 6",
    "Org_Type": null,
    "Parent_Id": "050301",
    "Seq_No": 3,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030104",
    "Org_Name": "Ronier 5",
    "Org_Type": null,
    "Parent_Id": "050301",
    "Seq_No": 5,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030105",
    "Org_Name": "Ronier 3",
    "Org_Type": null,
    "Parent_Id": "050301",
    "Seq_No": 4,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030106",
    "Org_Name": "Ronier D",
    "Org_Type": null,
    "Parent_Id": "050301",
    "Seq_No": 8,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030107",
    "Org_Name": "Ronier N",
    "Org_Type": null,
    "Parent_Id": "050301",
    "Seq_No": 7,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030108",
    "Org_Name": "Ronier CN",
    "Org_Type": null,
    "Parent_Id": "050301",
    "Seq_No": 6,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050302",
    "Org_Name": "Mimosa",
    "Org_Type": null,
    "Parent_Id": "0503",
    "Seq_No": 8,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030201",
    "Org_Name": "Phoenix 1",
    "Org_Type": null,
    "Parent_Id": "050302",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030202",
    "Org_Name": "Mimosa 4",
    "Org_Type": null,
    "Parent_Id": "050302",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030203",
    "Org_Name": "Mimosa N",
    "Org_Type": null,
    "Parent_Id": "050302",
    "Seq_No": 8,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030204",
    "Org_Name": "Mimosa 3",
    "Org_Type": null,
    "Parent_Id": "050302",
    "Seq_No": 3,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030205",
    "Org_Name": "Mimosa E",
    "Org_Type": null,
    "Parent_Id": "050302",
    "Seq_No": 7,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030206",
    "Org_Name": "Mimosa 9",
    "Org_Type": null,
    "Parent_Id": "050302",
    "Seq_No": 6,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030207",
    "Org_Name": "Mimosa W",
    "Org_Type": null,
    "Parent_Id": "050302",
    "Seq_No": 5,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030208",
    "Org_Name": "Mimosa 8",
    "Org_Type": null,
    "Parent_Id": "050302",
    "Seq_No": 4,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050303",
    "Org_Name": "Prosopis",
    "Org_Type": null,
    "Parent_Id": "0503",
    "Seq_No": 9,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030301",
    "Org_Name": "Prosopis 1",
    "Org_Type": null,
    "Parent_Id": "050303",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030302",
    "Org_Name": "Prosopis E",
    "Org_Type": null,
    "Parent_Id": "050303",
    "Seq_No": 3,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030303",
    "Org_Name": "Prosopis C",
    "Org_Type": null,
    "Parent_Id": "050303",
    "Seq_No": 4,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030304",
    "Org_Name": "Prosopis N",
    "Org_Type": null,
    "Parent_Id": "050303",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050304",
    "Org_Name": "Baobab",
    "Org_Type": null,
    "Parent_Id": "0503",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030401",
    "Org_Name": "Baobab C1",
    "Org_Type": null,
    "Parent_Id": "050304",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030402",
    "Org_Name": "Baobab C5",
    "Org_Type": null,
    "Parent_Id": "050304",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030403",
    "Org_Name": "Baobab SE",
    "Org_Type": null,
    "Parent_Id": "050304",
    "Seq_No": 3,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030404",
    "Org_Name": "Baobab N",
    "Org_Type": null,
    "Parent_Id": "050304",
    "Seq_No": 4,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030405",
    "Org_Name": "Baobab 1/2",
    "Org_Type": null,
    "Parent_Id": "050304",
    "Seq_No": 5,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030406",
    "Org_Name": "Baobab S",
    "Org_Type": null,
    "Parent_Id": "050304",
    "Seq_No": 6,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030407",
    "Org_Name": "Baobab NE",
    "Org_Type": null,
    "Parent_Id": "050304",
    "Seq_No": 7,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050305",
    "Org_Name": "Daniela",
    "Org_Type": null,
    "Parent_Id": "0503",
    "Seq_No": 11,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030501",
    "Org_Name": "Daniela 1",
    "Org_Type": null,
    "Parent_Id": "050305",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030502",
    "Org_Name": "Daniela 6",
    "Org_Type": null,
    "Parent_Id": "050305",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030503",
    "Org_Name": "Daniela E",
    "Org_Type": null,
    "Parent_Id": "050305",
    "Seq_No": 3,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030504",
    "Org_Name": "Daniela 5",
    "Org_Type": null,
    "Parent_Id": "050305",
    "Seq_No": 5,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030505",
    "Org_Name": "Daniela W",
    "Org_Type": null,
    "Parent_Id": "050305",
    "Seq_No": 4,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050306",
    "Org_Name": "Raphia",
    "Org_Type": null,
    "Parent_Id": "0503",
    "Seq_No": 12,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030601",
    "Org_Name": "Raphia S7",
    "Org_Type": null,
    "Parent_Id": "050306",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030602",
    "Org_Name": "Raphia S1",
    "Org_Type": null,
    "Parent_Id": "050306",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030603",
    "Org_Name": "Raphia S5",
    "Org_Type": null,
    "Parent_Id": "050306",
    "Seq_No": 3,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030604",
    "Org_Name": "Raphia S8",
    "Org_Type": null,
    "Parent_Id": "050306",
    "Seq_No": 4,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030605",
    "Org_Name": "Raphia SW",
    "Org_Type": null,
    "Parent_Id": "050306",
    "Seq_No": 5,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030606",
    "Org_Name": "Raphia 1",
    "Org_Type": null,
    "Parent_Id": "050306",
    "Seq_No": 6,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050307",
    "Org_Name": "Lanea",
    "Org_Type": null,
    "Parent_Id": "0503",
    "Seq_No": 13,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030701",
    "Org_Name": "Lanea 1",
    "Org_Type": null,
    "Parent_Id": "050307",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030702",
    "Org_Name": "Lanea E-3",
    "Org_Type": null,
    "Parent_Id": "050307",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030703",
    "Org_Name": "Lanea E-2",
    "Org_Type": null,
    "Parent_Id": "050307",
    "Seq_No": 4,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030704",
    "Org_Name": "Lanea SE",
    "Org_Type": null,
    "Parent_Id": "050307",
    "Seq_No": 3,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050308",
    "Org_Name": "Doca",
    "Org_Type": null,
    "Parent_Id": "0503",
    "Seq_No": 3,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030801",
    "Org_Name": "Doca 1",
    "Org_Type": null,
    "Parent_Id": "050308",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050309",
    "Org_Name": "Mango",
    "Org_Type": null,
    "Parent_Id": "0503",
    "Seq_No": 4,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05030901",
    "Org_Name": "Mango 1",
    "Org_Type": null,
    "Parent_Id": "050309",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050310",
    "Org_Name": "Moul",
    "Org_Type": null,
    "Parent_Id": "0503",
    "Seq_No": 5,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05031001",
    "Org_Name": "Moul 1",
    "Org_Type": null,
    "Parent_Id": "050310",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050311",
    "Org_Name": "Nafoura",
    "Org_Type": null,
    "Parent_Id": "0503",
    "Seq_No": 5,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05031101",
    "Org_Name": "Nafoura 1",
    "Org_Type": null,
    "Parent_Id": "050311",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05031102",
    "Org_Name": "Nafoura 2",
    "Org_Type": null,
    "Parent_Id": "050311",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050312",
    "Org_Name": "Figuier",
    "Org_Type": null,
    "Parent_Id": "0503",
    "Seq_No": 6,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05031201",
    "Org_Name": "Figuier 1",
    "Org_Type": null,
    "Parent_Id": "050312",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "050313",
    "Org_Name": "Pera",
    "Org_Type": null,
    "Parent_Id": "0503",
    "Seq_No": 7,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "05031301",
    "Org_Name": "Pera 1",
    "Org_Type": null,
    "Parent_Id": "050313",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "06",
    "Org_Name": "PK",
    "Org_Type": null,
    "Parent_Id": "",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "0601",
    "Org_Name": "PKKR",
    "Org_Type": null,
    "Parent_Id": "06",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "060101",
    "Org_Name": "1928",
    "Org_Type": null,
    "Parent_Id": "0601",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "06010101",
    "Org_Name": "Buharsai",
    "Org_Type": null,
    "Parent_Id": "060101",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "060102",
    "Org_Name": "3939",
    "Org_Type": null,
    "Parent_Id": "0601",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "06010201",
    "Org_Name": "SWKB",
    "Org_Type": null,
    "Parent_Id": "060102",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "060103",
    "Org_Name": "4539",
    "Org_Type": null,
    "Parent_Id": "0601",
    "Seq_No": 3,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "06010301",
    "Org_Name": "KB",
    "Org_Type": null,
    "Parent_Id": "060103",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "0602",
    "Org_Name": "PKVI",
    "Org_Type": null,
    "Parent_Id": "06",
    "Seq_No": 2,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "0603",
    "Org_Name": "951D",
    "Org_Type": null,
    "Parent_Id": "06",
    "Seq_No": 4,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  },
  {
    "Org_Id": "060301",
    "Org_Name": "SEDoshan",
    "Org_Type": null,
    "Parent_Id": "0603",
    "Seq_No": 1,
    "Commission_Date": null,
    "Reservoir_Type": null,
    "Remarks": null
  }
]
