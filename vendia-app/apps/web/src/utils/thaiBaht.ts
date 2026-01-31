export const thaiBahtText = (amount: number): string => {
  const number = parseFloat(amount.toString().replace(/,/g, ''));
  const text = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า', 'สิบ'];
  const unit = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

  if (isNaN(number)) return '';

  const bahtText = (num: number): string => {
    let res = '';
    const numStr = num.toString();
    const len = numStr.length;

    for (let i = 0; i < len; i++) {
      const n = parseInt(numStr[i]);
      const digit = len - i - 1;

      if (n !== 0) {
        if (digit === 0 && n === 1 && len > 1) {
          res += 'เอ็ด';
        } else if (digit === 1 && n === 2) {
          res += 'ยี่';
        } else if (digit === 1 && n === 1) {
          res += '';
        } else {
          res += text[n];
        }

        if (digit === 1 && n === 1) {
          res += 'สิบ';
        } else if (digit !== 0 || (digit === 0 && n !== 1) || len === 1) {
          res += unit[digit];
        }
      }
    }
    return res;
  };

  const [baht, satang] = number.toFixed(2).split('.');
  let result = '';

  // Handle Baht
  if (parseInt(baht) === 0) {
      // If amount is 0.xx, do not say "Zero Baht" unless it's exactly 0.00
      // But usually "Zero Baht" is acceptable or just handled in Satang
  } else {
      const bahtLen = baht.length;
      if (bahtLen > 6) {
        const million = baht.substring(0, bahtLen - 6);
        const rest = baht.substring(bahtLen - 6);
        result += bahtText(parseInt(million)) + 'ล้าน' + bahtText(parseInt(rest));
      } else {
        result += bahtText(parseInt(baht));
      }
      result += 'บาท';
  }

  // Handle Satang
  const satangNum = parseInt(satang);
  if (satangNum === 0) {
    result += 'ถ้วน';
  } else {
    result += bahtText(satangNum) + 'สตางค์';
  }
  
  if (result === 'ถ้วน') return 'ศูนย์บาทถ้วน';

  return result;
};
