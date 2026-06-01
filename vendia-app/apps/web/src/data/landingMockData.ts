export type ServiceSlide = {
  id: number | string;
  title: string;
  description: string;
  priceLabel: string;
  meta: string;
  image: string;
};

export const metricImage =
  'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/584872454_4169869119935810_5477853065058364813_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeHHupjv7VXyKWmILsc_asIXKpV82G141MwqlXzYbXjUzBiRerduz06BUwU3q9OlRw38Zp9-Dq3iO3e1q1gimASi&_nc_ohc=hlsogu73xDAQ7kNvwFt3IdV&_nc_oc=Adr4FcF0bkxxCFzbTHTIPDUkeocpP5WOpdkzp4fBDxW37kNFxC2SNACXtmmLPSOMOwmo_v7uIIIq1aNSbgRvESY9&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=zHczvv3F85_ih1OcCBoLVA&_nc_ss=7b2a8&oh=00_Af9tP5pw0JHWeNqgDsHOcCMeVKvXDg3gf9Sb4GbjQxUhvA&oe=6A22DE7A';

export const faqImage =
  'https://voom-obs.line-scdn.net/htyWa9lFNN1dMdCRZCCIwLhYGJjRFfG4JBSllNx8fczFFejsEVHliNBtNIG4XK2UJAntnNUYdcGZBISkAVyoxMx1KIg/m800x1200';

export const testimonials = [
  {
    name: 'คุณอรทัย',
    role: 'ลูกค้าบ้านพักอาศัย',
    text: 'ช่างมาตรงเวลา ล้างสะอาด และแอร์เย็นขึ้นชัดเจน',
  },
  {
    name: 'คุณเอกชัย',
    role: 'เจ้าของร้านค้า',
    text: 'นัดไว งานเรียบร้อย แก้ปัญหาแอร์ไม่เย็นได้ตรงจุด',
  },
  {
    name: 'คุณนภัส',
    role: 'ลูกค้าติดตั้งแอร์ใหม่',
    text: 'ติดตั้งเรียบร้อย ช่างสุภาพ และแนะนำหน้างานดีมาก',
  },
  {
    name: 'คุณศิริพร',
    role: 'ลูกค้าคอนโด',
    text: 'ทำงานสะอาด เก็บหน้างานดี และกลิ่นอับหายไปเลย',
  },
  {
    name: 'คุณธนกร',
    role: 'เจ้าของร้านอาหาร',
    text: 'เรียกใช้หลายครั้งแล้ว ประทับใจเรื่องตรงเวลาและราคาโปร่งใส',
  },
  {
    name: 'คุณพรทิพย์',
    role: 'ลูกค้าย้ายแอร์',
    text: 'ย้ายแอร์เก็บงานสวย เดินท่อเรียบร้อย และให้คำแนะนำดี',
  },
  {
    name: 'คุณสุเมธ',
    role: 'ลูกค้าซ่อมแอร์',
    text: 'ได้คิวเร็ว แก้แอร์น้ำหยดตรงจุด และใช้งานได้ปกติ',
  },
  {
    name: 'คุณกัลยา',
    role: 'ลูกค้าหอพัก',
    text: 'ดูแลหลายเครื่องได้เป็นระบบ งานไว และราคาเข้าใจง่าย',
  },
  {
    name: 'คุณปวันรัตน์',
    role: 'ลูกค้าบ้านเดี่ยว',
    text: 'ล้างละเอียด แอร์กลับมาเย็นไว และอากาศสดชื่นขึ้นมาก',
  },
];

export const serviceProcessItems = [
  'ล้างแอร์บ้าน คอนโด ร้านค้า และสำนักงานได้ครบ',
  'ซ่อมอาการแอร์ไม่เย็น น้ำหยด เสียงดัง และระบบไฟขัดข้อง',
  'ติดตั้งแอร์ใหม่ ย้ายแอร์ และเดินท่ออย่างเป็นระเบียบ',
  'แจ้งราคาและรายละเอียดก่อนเริ่มงานทุกครั้ง',
];

export const seoFaqs = [
  {
    question: 'ล้างแอร์ เชียงใหม่ ราคาเริ่มต้นเท่าไร',
    answer: 'ค่าบริการล้างแอร์เริ่มต้น 500 บาท สำหรับแอร์ติดผนังทั่วไป โดยราคาจะขึ้นกับรูปแบบการล้าง ขนาด BTU และสภาพเครื่องจริง',
  },
  {
    question: 'ควรล้างแอร์บ่อยแค่ไหน',
    answer: 'โดยทั่วไปควรล้างแอร์ทุก 4-6 เดือน หากใช้งานทุกวัน อยู่ในห้องที่มีฝุ่นเยอะ หรือเริ่มมีกลิ่นอับ ควรล้างเร็วกว่าปกติ',
  },
  {
    question: 'ถ้าแอร์น้ำหยดหรือไม่เย็น ควรล้างหรือซ่อม',
    answer: 'ควรให้ช่างตรวจอาการก่อน เพราะบางกรณีเกิดจากความสกปรกสะสมและแก้ได้ด้วยการล้าง แต่บางกรณีอาจมีปัญหาที่อะไหล่หรือระบบน้ำยา',
  },
  {
    question: 'ล้างแอร์บ้าน คอนโด และร้านค้าในเชียงใหม่ได้ไหม',
    answer: 'ให้บริการล้างแอร์ในเชียงใหม่ทั้งบ้าน คอนโด ร้านค้า และสำนักงาน พร้อมช่วยแนะนำรูปแบบการล้างให้เหมาะกับหน้างาน',
  },
];

export const workGalleryItems = [
  {
    image: '/Images/IMG_8332.JPG',
    category: 'เตรียมเครื่องก่อนติดตั้ง',
    title: 'เตรียมเครื่องและอุปกรณ์ก่อนเข้าหน้างานจริง',
    text: 'จัดเตรียมเครื่องและอุปกรณ์ให้พร้อมก่อนเริ่มงาน ช่วยให้นัดติดตั้งได้ต่อเนื่องและหน้างานเดินไวขึ้น',
    size: 'feature',
  },
  {
    image: '/Images/IMG_8333.JPG',
    category: 'ติดตั้งแอร์ฝังฝ้า',
    title: 'ติดตั้งแอร์ฝังฝ้าในตำแหน่งใช้งานจริง',
    text: 'เหมาะกับร้านค้า สำนักงาน หรือพื้นที่ที่ต้องการงานติดตั้งเรียบร้อยและวางตำแหน่งแอร์ให้สวยกับห้อง',
    size: 'wide',
  },
  {
    image: '/Images/IMG_8334.JPG',
    category: 'เช็กตัวเครื่อง',
    title: 'ตรวจเช็กชุดภายในก่อนประกอบและส่งงาน',
    text: 'ตรวจรายละเอียดของตัวเครื่องระหว่างติดตั้ง เพื่อให้ระบบทำงานได้เรียบร้อยก่อนใช้งานจริง',
    size: 'regular',
  },
  {
    image: '/Images/IMG_8335.JPG',
    category: 'ยกเครื่องเข้าตำแหน่ง',
    title: 'ยกเครื่องเข้าตำแหน่งอย่างเป็นระบบ',
    text: 'ทีมช่างช่วยกันยกและติดตั้งอย่างเป็นขั้นตอน เหมาะกับงานที่ต้องการความมั่นคงและเก็บงานเรียบร้อย',
    size: 'tall',
  },
  {
    image: '/Images/IMG_8336.JPG',
    category: 'เดินระบบหน้างาน',
    title: 'เดินท่อและเก็บระบบให้เหมาะกับพื้นที่',
    text: 'ดูแลงานเดินท่อและเก็บรายละเอียดระหว่างติดตั้ง เพื่อให้งานออกมาดูเรียบร้อยและใช้งานได้มั่นใจ',
    size: 'regular',
  },
  {
    image: '/Images/IMG_8337.JPG',
    category: 'ติดตั้งหน้างานจริง',
    title: 'เข้าติดตั้งตามนัด พร้อมทีมช่วยยกและประกอบ',
    text: 'เหมาะกับหน้างานที่ต้องใช้หลายคนช่วยกันติดตั้ง เพื่อให้งานเดินต่อได้ไวและปลอดภัยมากขึ้น',
    size: 'wide',
  },
  {
    image: '/Images/IMG_8338.JPG',
    category: 'ล้างแอร์บ้าน',
    title: 'ล้างแอร์ในบ้านโดยดูแลพื้นที่รอบข้าง',
    text: 'เหมาะกับบ้านที่ต้องการล้างแอร์แบบระวังฝุ่นและน้ำ พร้อมคุมพื้นที่ใช้งานให้เรียบร้อยระหว่างทำงาน',
    size: 'regular',
  },
  {
    image: '/Images/IMG_8339.JPG',
    category: 'ล้างแอร์บ้าน',
    title: 'ล้างแอร์ในห้องนอนแบบดูแลพื้นที่รอบข้าง',
    text: 'เหมาะกับบ้านที่ต้องการล้างแอร์แบบสะอาดและระวังพื้นที่ใช้งาน ช่วยลดฝุ่น กลิ่นอับ และคืนความเย็นสบายได้ดีขึ้น',
    size: 'regular',
  },
  {
    image: '/Images/IMG_8340.JPG',
    category: 'พร้อมเริ่มงาน',
    title: 'ยกอุปกรณ์เข้าหน้างานให้พร้อมก่อนติดตั้ง',
    text: 'เตรียมทั้งเครื่อง มือช่าง และอุปกรณ์ให้พร้อมตั้งแต่ต้น ช่วยให้นัดหมายง่ายและเริ่มงานได้ตรงเวลา',
    size: 'wide',
  },
  {
    image: '/Images/IMG_8341.JPG',
    category: 'สำรวจพื้นที่ก่อนติดตั้ง',
    title: 'ประเมินพื้นที่ก่อนเลือกตำแหน่งติดตั้ง',
    text: 'ช่วยดูตำแหน่งติดตั้งและพื้นที่ใช้งานจริงก่อนเริ่มงาน เพื่อให้เลือกรุ่นและจุดติดตั้งได้เหมาะกับบ้านมากขึ้น',
    size: 'tall',
  },
];

export const pricingPlans = [
  {
    name: 'ล้างอัดโฟม',
    price: 'เริ่มต้น 500.-',
    tone: 'light',
    description: 'เหมาะกับแอร์บ้านใช้งานทั่วไป ช่วยลดฝุ่น กลิ่นอับ และเพิ่มความเย็น',
    items: ['รับประกัน 30 วัน', '1 เครื่อง มีค่าเดินทางเพิ่ม 100 บาท', 'เหมาะกับการล้างตามรอบ'],
  },
  {
    name: 'ล้างแก้น้ำหยด',
    price: '600.-',
    tone: 'dark',
    description: 'สำหรับอาการน้ำหยดจากเครื่อง พร้อมตรวจเช็กจุดเสี่ยงก่อนเริ่มงาน',
    items: ['รับประกัน 30 วัน', 'เหมาะกับอาการน้ำหยด', 'เช็กสาเหตุก่อนล้าง'],
  },
  {
    name: 'ล้างดับกลิ่นอับ',
    price: '600.-',
    tone: 'accent',
    description: 'ช่วยลดกลิ่นอับและกลิ่นสะสม เหมาะกับแอร์ที่ใช้งานทุกวัน',
    items: ['รับประกัน 30 วัน', 'ลดกลิ่นอับสะสม', 'เลือกตามสภาพแอร์จริง'],
  },
  {
    name: 'ล้างถอดโบลเวอร์',
    price: '700.-',
    tone: 'light',
    description: 'ล้างละเอียดขึ้นกว่างานทั่วไป เหมาะกับแอร์ที่มีคราบสะสมชัดเจน',
    items: ['รับประกัน 30 วัน', 'ถอดล้างละเอียดขึ้น', 'เหมาะกับแอร์สกปรกสะสม'],
  },
  {
    name: 'ล้างใหญ่ถอดละเอียด',
    price: '1,500.-',
    tone: 'dark',
    description: 'เหมาะกับแอร์ที่ใช้งานหนักหรือไม่ได้ล้างมานาน ต้องการล้างลึกทั้งระบบ',
    items: ['รับประกัน 90 วัน', 'เหมาะกับงานล้างลึก', 'ช่วยให้ระบบทำงานเต็มประสิทธิภาพ'],
  },
  {
    name: 'ตัดล้างแฟนคอยล์',
    price: '2,500 - 3,000.-',
    tone: 'accent',
    description: 'งานล้างเชิงลึกสำหรับเครื่องที่ต้องรื้อและเข้าถึงจุดสกปรกมากเป็นพิเศษ',
    items: ['รับประกัน 90 วัน', 'เหมาะกับงานล้างเชิงลึก', 'ราคาขึ้นกับหน้างานจริง'],
  },
];

export const inverterPackages = [
  {
    btu: '9,000 BTU',
    priceRange: '11,900 - 15,900.-',
    highlights: ['AUX เริ่มต้น 11,900.-', 'Daikin 15,700.-', 'รับประกัน 3 ปี'],
  },
  {
    btu: '12,000 BTU',
    priceRange: '12,900 - 18,900.-',
    highlights: ['AUX เริ่มต้น 12,900.-', 'TCL 14,900.-', 'รับประกัน 3 ปี'],
  },
  {
    btu: '18,000 BTU',
    priceRange: '18,500 - 30,700.-',
    highlights: ['Hisense / AUX 18,500.-', 'Daikin 29,900.-', 'รับประกัน 3 ปี'],
  },
  {
    btu: '24,000 BTU',
    priceRange: '23,500 - 45,500.-',
    highlights: ['TCL 23,500.-', 'AUX / Hisense 23,900.-', 'รับประกัน 3 ปี'],
  },
];

export const serviceCards = [
  {
    icon: 'bi-wind',
    title: 'ล้างแอร์',
    text: 'ช่วยให้แอร์เย็นไว ลมสะอาดขึ้น และลดกลิ่นอับจากการใช้งานสะสม',
  },
  {
    icon: 'bi-tools',
    title: 'ซ่อมและติดตั้งแอร์',
    text: 'ซ่อมอาการกวนใจ ติดตั้งใหม่ หรือย้ายแอร์ พร้อมเก็บงานเรียบร้อย',
  },
];

export const whyChooseUsCards = [
  {
    icon: 'bi-cash-coin',
    title: 'ราคาที่เป็นธรรม',
    text: 'แจ้งราคาชัดเจน สมเหตุสมผล และตรวจสอบได้',
  },
  {
    icon: 'bi-headset',
    title: 'ฝ่ายบริการลูกค้า',
    text: 'ตอบไว นัดหมายง่าย และให้คำปรึกษาตลอดงาน',
  },
  {
    icon: 'bi-tools',
    title: 'ช่างที่มีประสบการณ์',
    text: 'แก้ปัญหาตรงจุด ทำงานไว และมีมาตรฐาน',
  },
];

// Curated from current service usage in the database.
// Excludes operational line items such as discounts, deposits, and travel fees.
export const landingServiceSlides: ServiceSlide[] = [
  {
    id: 'db-picked-foam-cleaning',
    title: 'ล้างแอร์อัดโฟม',
    description: 'อ้างอิงจากบริการใช้งานจริงที่ถูกเลือกบ่อยที่สุด เหมาะกับแอร์ติดผนังทั่วไป ช่วยให้เย็นไว ลดฝุ่น และลดกลิ่นอับสะสม',
    priceLabel: 'เริ่มต้น 500.-',
    meta: 'อิงจากรายการล้างแอร์ยอดนิยมในระบบ',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/674996851_4314956185427102_1546532635244158674_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeG6eo5ElBzl91eTPooJ_hDH0Xi7jQ7oYk7ReLuNDuhiTh6p4Bp2ozY2DR_Opc33lhUdmxBXDMs5A-ouSWoAMgrT&_nc_ohc=mxxhacofJLUQ7kNvwH3_LaR&_nc_oc=Adp2Ny3g5oa0icohK3YwzzsMB4-_mZRcCsPFm0EHzwK7BJfY9UneZ1Ar9CwJrKXKAth2RHX2fR_iVBJH_gtkHmWF&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=bZydDQuzEqE835GmCgDICw&_nc_ss=7b2a8&oh=00_Af80dq0q3vQVtbeyZxECuZEFMokCVDHFjVtyW9eogMobMg&oe=6A22DC33',
  },
  {
    id: 'db-picked-blower-cleaning',
    title: 'ล้างแอร์ถอดโบลเวอร์',
    description: 'เหมาะกับแอร์ที่มีคราบสะสมมากกว่าปกติ ต้องการล้างละเอียดขึ้นกว่างานทั่วไป และเป็นหนึ่งในบริการล้างที่มีการใช้งานจริงต่อเนื่อง',
    priceLabel: 'เริ่มต้น 700.-',
    meta: 'เหมาะกับงานล้างละเอียด',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/672085223_4311741569081897_4151352964468052596_n.jpg?_nc_cat=105&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeEXqm2_EWaNMETfA2835lCOZj00OnIkRZ1mPTQ6ciRFnQSs7il9DsxaCMYStRxyCePXXLzVyYdDe06kWXRS8Jju&_nc_ohc=pcJ5hCrLUHoQ7kNvwFsDTzh&_nc_oc=AdplME5oAMbUcvXmmulNeraED1SOstf2K1gn0FkZ0gqgDaNclx5DnL2H43l0KmuVOBsKrRG03aD_Gdw8Zek3bsT9&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=s84j_a6hpgqNtV9x57QyUA&_nc_ss=7b2a8&oh=00_Af8bMo81Coz5I3XT_k3v-rDZn8hSnvXo1vdnO81-Bh5jHg&oe=6A22E6E6',
  },
  {
    id: 'db-picked-drip-cleaning',
    title: 'ล้างแอร์แก้น้ำหยด',
    description: 'คัดจากบริการที่มีการใช้งานจริงในหมวดล้างและเช็กซ่อม เหมาะกับลูกค้าที่เริ่มมีอาการน้ำหยดและต้องการตรวจเช็กก่อนอาการลุกลาม',
    priceLabel: 'เริ่มต้น 600.-',
    meta: 'เหมาะกับอาการน้ำหยดเบื้องต้น',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/641384842_4262169704039084_523670833683239262_n.jpg?_nc_cat=111&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeG1_7DbUb7OTRPDuJGr4f4KhCLIvoGTyt-EIsi-gZPK3786tsLBLyJBVCRwKj8w3A89R_RJtUyKI5u-5N6Grg18&_nc_ohc=gz02p5nz-DUQ7kNvwFe1JrT&_nc_oc=AdrzsMOqPim8bMr8eU8pbzvkMHDxB0FoRxf8NnXSdq24E25oXLBEkCwDgYGnRWU3rB0VRrVxl68zPjBWL2QGkTcN&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=riiiAYfspnb4Vmbi4See5Q&_nc_ss=7b2a8&oh=00_Af-aMDWPptpRBymbMhN_TD6Z4ZC0K42xGdBh_mfcCTczvw&oe=6A22D3A3',
  },
  {
    id: 'db-picked-deodorize',
    title: 'ล้างแอร์ดับกลิ่นอับ',
    description: 'เหมาะกับแอร์ที่มีกลิ่นอับ เปิดแล้วไม่สดชื่น หรือใช้งานทุกวันจนเริ่มมีคราบสะสม ช่วยให้ลมสะอาดและใช้งานสบายขึ้น',
    priceLabel: 'เริ่มต้น 600.-',
    meta: 'ตอบโจทย์แอร์มีกลิ่นและอับชื้น',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/674996851_4314956185427102_1546532635244158674_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeG6eo5ElBzl91eTPooJ_hDH0Xi7jQ7oYk7ReLuNDuhiTh6p4Bp2ozY2DR_Opc33lhUdmxBXDMs5A-ouSWoAMgrT&_nc_ohc=mxxhacofJLUQ7kNvwH3_LaR&_nc_oc=Adp2Ny3g5oa0icohK3YwzzsMB4-_mZRcCsPFm0EHzwK7BJfY9UneZ1Ar9CwJrKXKAth2RHX2fR_iVBJH_gtkHmWF&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=bZydDQuzEqE835GmCgDICw&_nc_ss=7b2a8&oh=00_Af80dq0q3vQVtbeyZxECuZEFMokCVDHFjVtyW9eogMobMg&oe=6A22DC33',
  },
  {
    id: 'db-picked-diagnostic',
    title: 'ตรวจเช็กและประเมินอาการแอร์',
    description: 'อ้างอิงจากรายการตรวจเช็กที่ถูกใช้งานจริงในระบบ เหมาะกับเคสแอร์ไม่เย็น น้ำหยด หรือยังไม่แน่ใจว่าควรล้างหรือซ่อมก่อน',
    priceLabel: 'เริ่มต้น 500.-',
    meta: 'เช็กอาการก่อนเริ่มซ่อม',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/659109428_4299277150328339_5154581625169831385_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeFrklM2nF1El417jtA7WZIokpMl1L2vBiaSkyXUva8GJno2oBNL7HA28bTYsEDxLRFDYmlTZ8l7aI553D1ENiic&_nc_ohc=NrB0yyBhEeEQ7kNvwFBaI9T&_nc_oc=AdqLj2NCoN1MHzAHgTDYn8i_NjFseJhi2tlEDw8OREn8vclDUxBfWMKzowTixqx4_W6NW60OyL4AQ4qLRJDIh8hq&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=3M7HDYxcde_OdefukWX6UA&_nc_ss=7b2a8&oh=00_Af98DXgQ_Mrk2czc0Pd7kDsG1u1VK678U69GGjUpjnhc3g&oe=6A22D934',
  },
  {
    id: 'db-picked-repair-cooling',
    title: 'ซ่อมแอร์ไม่เย็นและอาการกวนใจ',
    description: 'เหมาะกับเคสแอร์ไม่เย็น เปิดไม่ติด ไฟกระชาก หรือมีอาการผิดปกติระหว่างใช้งาน โดยเริ่มจากตรวจเช็กและอธิบายแนวทางก่อนซ่อมทุกครั้ง',
    priceLabel: 'ประเมินตามอาการ',
    meta: 'เหมาะกับอาการไม่เย็น เปิดไม่ติด และระบบไฟ',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/672085223_4311741569081897_4151352964468052596_n.jpg?_nc_cat=105&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeEXqm2_EWaNMETfA2835lCOZj00OnIkRZ1mPTQ6ciRFnQSs7il9DsxaCMYStRxyCePXXLzVyYdDe06kWXRS8Jju&_nc_ohc=pcJ5hCrLUHoQ7kNvwFsDTzh&_nc_oc=AdplME5oAMbUcvXmmulNeraED1SOstf2K1gn0FkZ0gqgDaNclx5DnL2H43l0KmuVOBsKrRG03aD_Gdw8Zek3bsT9&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=s84j_a6hpgqNtV9x57QyUA&_nc_ss=7b2a8&oh=00_Af8bMo81Coz5I3XT_k3v-rDZn8hSnvXo1vdnO81-Bh5jHg&oe=6A22E6E6',
  },
  {
    id: 'db-picked-install-move',
    title: 'ติดตั้งใหม่และย้ายแอร์',
    description: 'สรุปจากรายการติดตั้งและรื้อย้ายที่มีการขายจริง เหมาะกับลูกค้าที่ต้องการติดตั้งแอร์ใหม่ ย้ายตำแหน่ง หรือรื้อถอนพร้อมติดตั้งกลับอย่างเป็นระบบ',
    priceLabel: 'เริ่มต้น 2,500.-',
    meta: 'อิงจากงานติดตั้ง 9,000-12,000 BTU',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/710745739_4356611954594858_344743098785015488_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeFo8MGfadeOp6hs2ZRtklhRxUla-ehNeAvFSVr56E14C9Cu6IRhSpD6YKrtuHWjdd9tYhij9OQCodns32aw0nAH&_nc_ohc=balpCtVrNKkQ7kNvwGzREcG&_nc_oc=AdreNlj9bPEJBUopirR63s2raIizSFQwezrnJEk9lBqqWWtHIlnGwm-1v4tTUxuCykKpq4294e65gNhG1kX5X8NT&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=ukBzGVhiOLPYksNIGhpomg&_nc_ss=7b2a8&oh=00_Af_PQ-98uRSNFxVv74E9P5I7ru8QujZiP7cZco7aufZ40A&oe=6A22F2F5',
  },
  {
    id: 'db-picked-inverter-install',
    title: 'ติดตั้งแอร์ Inverter สำหรับบ้านและร้าน',
    description: 'เหมาะกับลูกค้าที่ติดตั้งแอร์ใหม่และอยากได้งานเรียบร้อย ดูดี และเลือกขนาดเครื่องกับอุปกรณ์ให้เหมาะกับพื้นที่ใช้งานจริง',
    priceLabel: 'ขอราคาตาม BTU',
    meta: 'เหมาะกับบ้าน คอนโด ร้านค้า และสำนักงาน',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/659109428_4299277150328339_5154581625169831385_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeFrklM2nF1El417jtA7WZIokpMl1L2vBiaSkyXUva8GJno2oBNL7HA28bTYsEDxLRFDYmlTZ8l7aI553D1ENiic&_nc_ohc=NrB0yyBhEeEQ7kNvwFBaI9T&_nc_oc=AdqLj2NCoN1MHzAHgTDYn8i_NjFseJhi2tlEDw8OREn8vclDUxBfWMKzowTixqx4_W6NW60OyL4AQ4qLRJDIh8hq&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=3M7HDYxcde_OdefukWX6UA&_nc_ss=7b2a8&oh=00_Af98DXgQ_Mrk2czc0Pd7kDsG1u1VK678U69GGjUpjnhc3g&oe=6A22D934',
  },
  {
    id: 'db-picked-commercial-cleaning',
    title: 'ล้างแอร์ร้านค้า สำนักงาน และหน้างานธุรกิจ',
    description: 'เหมาะกับร้านค้า สำนักงาน และพื้นที่ที่เปิดใช้งานทั้งวัน ต้องการดูแลแอร์หลายเครื่องให้เย็นต่อเนื่องและลดฝุ่นสะสมในระบบ',
    priceLabel: 'ประเมินตามหน้างาน',
    meta: 'ตอบโจทย์งานดูแลหลายเครื่องและงานเชิงพาณิชย์',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/641384842_4262169704039084_523670833683239262_n.jpg?_nc_cat=111&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeG1_7DbUb7OTRPDuJGr4f4KhCLIvoGTyt-EIsi-gZPK3786tsLBLyJBVCRwKj8w3A89R_RJtUyKI5u-5N6Grg18&_nc_ohc=gz02p5nz-DUQ7kNvwFe1JrT&_nc_oc=AdrzsMOqPim8bMr8eU8pbzvkMHDxB0FoRxf8NnXSdq24E25oXLBEkCwDgYGnRWU3rB0VRrVxl68zPjBWL2QGkTcN&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=riiiAYfspnb4Vmbi4See5Q&_nc_ss=7b2a8&oh=00_Af-aMDWPptpRBymbMhN_TD6Z4ZC0K42xGdBh_mfcCTczvw&oe=6A22D3A3',
  },
  {
    id: 'db-picked-ceiling-cassette',
    title: 'ล้างแอร์ 4 ทิศทางและแอร์แขวน',
    description: 'เหมาะกับร้านอาหาร คาเฟ่ ออฟฟิศ และพื้นที่ที่ใช้แอร์เชิงพาณิชย์ ต้องการล้างละเอียดและดูแลระบบให้พร้อมใช้งานต่อเนื่อง',
    priceLabel: 'เริ่มต้น 1,500.-',
    meta: 'รองรับแอร์ 4 ทิศทาง แอร์แขวน และเครื่องขนาดใหญ่',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/710745739_4356611954594858_344743098785015488_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeFo8MGfadeOp6hs2ZRtklhRxUla-ehNeAvFSVr56E14C9Cu6IRhSpD6YKrtuHWjdd9tYhij9OQCodns32aw0nAH&_nc_ohc=balpCtVrNKkQ7kNvwGzREcG&_nc_oc=AdreNlj9bPEJBUopirR63s2raIizSFQwezrnJEk9lBqqWWtHIlnGwm-1v4tTUxuCykKpq4294e65gNhG1kX5X8NT&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=ukBzGVhiOLPYksNIGhpomg&_nc_ss=7b2a8&oh=00_Af_PQ-98uRSNFxVv74E9P5I7ru8QujZiP7cZco7aufZ40A&oe=6A22F2F5',
  },
  {
    id: 'db-picked-turn-old-air',
    title: 'เทิร์นแอร์เก่า พร้อมรื้อถอน',
    description: 'เหมาะกับลูกค้าที่กำลังติดตั้งแอร์ใหม่และไม่อยากจัดการเครื่องเก่าด้วยตัวเอง สามารถส่งรูปให้ประเมินเบื้องต้นและวางแผนรื้อถอนได้ก่อนนัดงาน',
    priceLabel: 'สอบถามประเมิน',
    meta: 'ช่วยปิดงานติดตั้งใหม่ได้ง่ายขึ้น',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/659109428_4299277150328339_5154581625169831385_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeFrklM2nF1El417jtA7WZIokpMl1L2vBiaSkyXUva8GJno2oBNL7HA28bTYsEDxLRFDYmlTZ8l7aI553D1ENiic&_nc_ohc=NrB0yyBhEeEQ7kNvwFBaI9T&_nc_oc=AdqLj2NCoN1MHzAHgTDYn8i_NjFseJhi2tlEDw8OREn8vclDUxBfWMKzowTixqx4_W6NW60OyL4AQ4qLRJDIh8hq&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=3M7HDYxcde_OdefukWX6UA&_nc_ss=7b2a8&oh=00_Af98DXgQ_Mrk2czc0Pd7kDsG1u1VK678U69GGjUpjnhc3g&oe=6A22D934',
  },
];
