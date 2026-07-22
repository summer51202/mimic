export const POLICY_EFFECTIVE_DATE = "2026-07-23";

export const publicCopy = {
  productName: "mimic",
  characterNameZh: "咪咪庫",
  characterNameEn: "Mimiku",
  tagline: "一起存，一起花，一起在異世界探險吧!",
  features: [
    {
      title: "共同基金",
      body: "為旅行、房租、約會、寵物照護或任何共同目標建立基金。每一筆收支都歸屬到指定基金，讓餘額、用途與責任邊界保持清楚。",
    },
    {
      title: "出資紀錄",
      body: "記錄定期出資、一次性出資、調整與更正。mimic 以實際入金與成員分攤建立部位，方便追蹤誰已多付、誰仍需補足。",
    },
    {
      title: "支出分帳",
      body: "支援等分、比例、固定金額與混合分帳，也能記錄多人付款。每筆支出會拆成付款人與分攤人，保留真實的金流脈絡。",
    },
    {
      title: "結算鎖定",
      body: "完成結算後，該期間會被鎖定，不能回頭修改舊交易。若發現錯誤，請用新的更正交易留下清楚的審計軌跡。",
    },
  ],
  policy: {
    privacyStatus:
      "本頁是預發布版本的隱私權說明殼層，正式上線前會補齊資料處理、保留期間、第三方服務與使用者權利等內容。",
    termsStatus:
      "本頁是預發布版本的服務條款殼層，正式上線前會補齊帳號、服務使用、責任限制、終止與準據法等內容。",
  },
} as const;
