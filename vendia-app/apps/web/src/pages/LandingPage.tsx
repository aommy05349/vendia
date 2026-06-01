import { useEffect, useMemo, useState } from 'react';
import { useProductStore, type Product } from '@vendia/shared';

type ShopInfo = {
  name?: string | null;
  company_name?: string | null;
  logo_path?: string | null;
};

type LandingPageProps = {
  shop?: ShopInfo | null;
  user?: { role?: string | null } | null;
  getStorageUrl: (path?: string | null) => string;
};

type LandingTheme = 'classic' | 'gold' | 'ocean' | 'emerald';

const LANDING_THEME_STORAGE_KEY = 'vendia-landing-theme';
const GALLERY_REVEAL_RHYTHM = [0, 88, 148, 62, 182, 108, 224, 138, 266, 174];
const PRICING_REVEAL_RHYTHM = [0, 118, 58, 168, 92, 198];
const INSTALL_REVEAL_RHYTHM = [36, 128, 82, 176];

const landingThemes: Array<{ value: LandingTheme; label: string }> = [
  { value: 'gold', label: 'Golden Yellow' },
  { value: 'classic', label: 'Classic Red' },
  { value: 'ocean', label: 'Ocean Blue' },
  { value: 'emerald', label: 'Emerald Green' },
];

function isLandingTheme(value: string | null): value is LandingTheme {
  return landingThemes.some((theme) => theme.value === value);
}

const metricImage =
  'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/584872454_4169869119935810_5477853065058364813_n.jpg?_nc_cat=110&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeHHupjv7VXyKWmILsc_asIXKpV82G141MwqlXzYbXjUzBiRerduz06BUwU3q9OlRw38Zp9-Dq3iO3e1q1gimASi&_nc_ohc=hlsogu73xDAQ7kNvwFt3IdV&_nc_oc=Adr4FcF0bkxxCFzbTHTIPDUkeocpP5WOpdkzp4fBDxW37kNFxC2SNACXtmmLPSOMOwmo_v7uIIIq1aNSbgRvESY9&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=zHczvv3F85_ih1OcCBoLVA&_nc_ss=7b2a8&oh=00_Af9tP5pw0JHWeNqgDsHOcCMeVKvXDg3gf9Sb4GbjQxUhvA&oe=6A22DE7A';
const faqImage =
  'https://voom-obs.line-scdn.net/htyWa9lFNN1dMdCRZCCIwLhYGJjRFfG4JBSllNx8fczFFejsEVHliNBtNIG4XK2UJAntnNUYdcGZBISkAVyoxMx1KIg/m800x1200';

const testimonials = [
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

const serviceProcessItems = [
  'ล้างแอร์บ้าน คอนโด ร้านค้า และสำนักงานได้ครบ',
  'ซ่อมอาการแอร์ไม่เย็น น้ำหยด เสียงดัง และระบบไฟขัดข้อง',
  'ติดตั้งแอร์ใหม่ ย้ายแอร์ และเดินท่ออย่างเป็นระเบียบ',
  'แจ้งราคาและรายละเอียดก่อนเริ่มงานทุกครั้ง',
];

const seoFaqs = [
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

const workGalleryItems = [
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

const pricingPlans = [
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

const inverterPackages = [
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

const serviceCards = [
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

const whyChooseUsCards = [
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

const fallbackServiceSlides = [
  {
    id: 'fallback-1',
    title: 'ล้างแอร์บ้าน',
    description: 'ล้างจุดสำคัญภายในเครื่องให้สะอาดขึ้น ช่วยให้แอร์เย็นไว ลดกลิ่นอับ และใช้งานได้เต็มประสิทธิภาพ',
    priceLabel: 'เริ่มต้น 500.-',
    meta: 'เหมาะสำหรับบ้านและคอนโด',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/674996851_4314956185427102_1546532635244158674_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeG6eo5ElBzl91eTPooJ_hDH0Xi7jQ7oYk7ReLuNDuhiTh6p4Bp2ozY2DR_Opc33lhUdmxBXDMs5A-ouSWoAMgrT&_nc_ohc=mxxhacofJLUQ7kNvwH3_LaR&_nc_oc=Adp2Ny3g5oa0icohK3YwzzsMB4-_mZRcCsPFm0EHzwK7BJfY9UneZ1Ar9CwJrKXKAth2RHX2fR_iVBJH_gtkHmWF&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=bZydDQuzEqE835GmCgDICw&_nc_ss=7b2a8&oh=00_Af80dq0q3vQVtbeyZxECuZEFMokCVDHFjVtyW9eogMobMg&oe=6A22DC33',
  },
  {
    id: 'fallback-2',
    title: 'ซ่อมแอร์',
    description: 'เช็กอาการแอร์ไม่เย็น น้ำหยด เสียงดัง หรือไฟขัดข้อง แล้วแจ้งแนวทางแก้ไขให้เข้าใจก่อนเริ่มงาน',
    priceLabel: 'ประเมินหน้างาน',
    meta: 'เช็กอาการก่อนซ่อม',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/672085223_4311741569081897_4151352964468052596_n.jpg?_nc_cat=105&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeEXqm2_EWaNMETfA2835lCOZj00OnIkRZ1mPTQ6ciRFnQSs7il9DsxaCMYStRxyCePXXLzVyYdDe06kWXRS8Jju&_nc_ohc=pcJ5hCrLUHoQ7kNvwFsDTzh&_nc_oc=AdplME5oAMbUcvXmmulNeraED1SOstf2K1gn0FkZ0gqgDaNclx5DnL2H43l0KmuVOBsKrRG03aD_Gdw8Zek3bsT9&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=s84j_a6hpgqNtV9x57QyUA&_nc_ss=7b2a8&oh=00_Af8bMo81Coz5I3XT_k3v-rDZn8hSnvXo1vdnO81-Bh5jHg&oe=6A22E6E6',
  },
  {
    id: 'fallback-3',
    title: 'ติดตั้งแอร์',
    description: 'ติดตั้งแอร์ใหม่ ย้ายแอร์ หรือรื้อแอร์ โดยจัดตำแหน่งและเดินงานให้เหมาะกับหน้างานจริง',
    priceLabel: 'สอบถามราคา',
    meta: 'รองรับบ้าน ร้านค้า และสำนักงาน',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/710745739_4356611954594858_344743098785015488_n.jpg?_nc_cat=107&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeFo8MGfadeOp6hs2ZRtklhRxUla-ehNeAvFSVr56E14C9Cu6IRhSpD6YKrtuHWjdd9tYhij9OQCodns32aw0nAH&_nc_ohc=balpCtVrNKkQ7kNvwGzREcG&_nc_oc=AdreNlj9bPEJBUopirR63s2raIizSFQwezrnJEk9lBqqWWtHIlnGwm-1v4tTUxuCykKpq4294e65gNhG1kX5X8NT&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=ukBzGVhiOLPYksNIGhpomg&_nc_ss=7b2a8&oh=00_Af_PQ-98uRSNFxVv74E9P5I7ru8QujZiP7cZco7aufZ40A&oe=6A22F2F5',
  },
  {
    id: 'fallback-4',
    title: 'ล้างแอร์เชิงพาณิชย์',
    description: 'ดูแลแอร์ร้านค้า สำนักงาน และระบบขนาดใหญ่ ให้ใช้งานต่อเนื่อง ลดฝุ่นสะสม และช่วยยืดอายุเครื่อง',
    priceLabel: 'ประเมินตามหน้างาน',
    meta: 'เหมาะกับธุรกิจและอาคารพาณิชย์',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/641384842_4262169704039084_523670833683239262_n.jpg?_nc_cat=111&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeG1_7DbUb7OTRPDuJGr4f4KhCLIvoGTyt-EIsi-gZPK3786tsLBLyJBVCRwKj8w3A89R_RJtUyKI5u-5N6Grg18&_nc_ohc=gz02p5nz-DUQ7kNvwFe1JrT&_nc_oc=AdrzsMOqPim8bMr8eU8pbzvkMHDxB0FoRxf8NnXSdq24E25oXLBEkCwDgYGnRWU3rB0VRrVxl68zPjBWL2QGkTcN&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=riiiAYfspnb4Vmbi4See5Q&_nc_ss=7b2a8&oh=00_Af-aMDWPptpRBymbMhN_TD6Z4ZC0K42xGdBh_mfcCTczvw&oe=6A22D3A3',
  },
  {
    id: 'fallback-5',
    title: 'ติดตั้งแอร์ Inverter',
    description: 'เหมาะกับการติดตั้งแอร์ใหม่ที่ต้องการงานเรียบร้อย ดูสวย และเลือกอุปกรณ์ให้เหมาะกับพื้นที่ใช้งาน',
    priceLabel: 'ขอราคาเต็ม',
    meta: 'พร้อมสำรวจหน้างาน',
    image:
      'https://scontent.fcnx2-1.fna.fbcdn.net/v/t39.30808-6/659109428_4299277150328339_5154581625169831385_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=833d8c&_nc_eui2=AeFrklM2nF1El417jtA7WZIokpMl1L2vBiaSkyXUva8GJno2oBNL7HA28bTYsEDxLRFDYmlTZ8l7aI553D1ENiic&_nc_ohc=NrB0yyBhEeEQ7kNvwFBaI9T&_nc_oc=AdqLj2NCoN1MHzAHgTDYn8i_NjFseJhi2tlEDw8OREn8vclDUxBfWMKzowTixqx4_W6NW60OyL4AQ4qLRJDIh8hq&_nc_zt=23&_nc_ht=scontent.fcnx2-1.fna&_nc_gid=3M7HDYxcde_OdefukWX6UA&_nc_ss=7b2a8&oh=00_Af98DXgQ_Mrk2czc0Pd7kDsG1u1VK678U69GGjUpjnhc3g&oe=6A22D934',
  },
];

type ServiceSlide = {
  id: number | string;
  title: string;
  description: string;
  priceLabel: string;
  meta: string;
  image: string;
};

const currencyFormatter = new Intl.NumberFormat('th-TH', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const AUTO_SLIDE_INTERVAL = 3000;
const TESTIMONIAL_AUTO_SLIDE_INTERVAL = 5500;

function truncateText(text: string, maxLength: number) {
  if (text.length <= maxLength) return text;
  const trimmed = text.slice(0, maxLength).trim();
  const lastSpace = trimmed.lastIndexOf(' ');
  return `${lastSpace > 0 ? trimmed.slice(0, lastSpace) : trimmed}...`;
}

export function LandingPage({ shop, user, getStorageUrl }: LandingPageProps) {
  const brandName = shop?.name || 'PT Air Service';
  const brandTagline = 'บริการล้างแอร์ ซ่อมแอร์ ติดตั้งแอร์ ครบวงจรในเชียงใหม่ พร้อมให้คำปรึกษาและนัดหมายได้สะดวก';
  const seoTitle = 'ล้างแอร์ เชียงใหม่ ราคาเริ่มต้น 500 บาท | PT Air Service';
  const seoDescription =
    'บริการล้างแอร์ เชียงใหม่ สำหรับบ้าน คอนโด ร้านค้า และสำนักงาน แจ้งราคาก่อนเริ่มงาน นัดคิวง่าย ทัก Line หรือโทรได้ทันที';
  const dashboardHref = user ? '/admin' : '/admin/login';
  const lineContactUrl = 'https://line.me/R/ti/p/@ptairservice';
  const lineQrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(lineContactUrl)}`;
  const { products, fetchProducts } = useProductStore();
  const [focusedServiceIndex, setFocusedServiceIndex] = useState(0);
  const [testimonialItemsPerPage, setTestimonialItemsPerPage] = useState(3);
  const [focusedTestimonialPage, setFocusedTestimonialPage] = useState(0);
  const [brandLogoBroken, setBrandLogoBroken] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<LandingTheme>(() => {
    if (typeof window === 'undefined') return 'classic';
    const savedTheme = window.localStorage.getItem(LANDING_THEME_STORAGE_KEY);
    return isLandingTheme(savedTheme) ? savedTheme : 'classic';
  });
  const brandLogoSrc = shop?.logo_path ? getStorageUrl(shop.logo_path) : '';

  useEffect(() => {
    setBrandLogoBroken(false);
  }, [brandLogoSrc]);

  useEffect(() => {
    window.localStorage.setItem(LANDING_THEME_STORAGE_KEY, selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    const revealElements = Array.from(document.querySelectorAll<HTMLElement>('.landing-page [data-reveal]'));
    if (revealElements.length === 0) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    revealElements.forEach((element) => {
      const delay = element.dataset.revealDelay;
      if (delay) {
        element.style.setProperty('--landing-reveal-delay', `${delay}ms`);
      }
    });

    if (prefersReducedMotion) {
      revealElements.forEach((element) => element.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.16,
        rootMargin: '0px 0px -10% 0px',
      },
    );

    revealElements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    document.title = seoTitle;
    document.documentElement.lang = 'th';

    const upsertMeta = (name: string, content: string) => {
      let meta = document.head.querySelector(`meta[name="${name}"]`);
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', content);
    };

    upsertMeta('description', seoDescription);
    upsertMeta('keywords', 'ล้างแอร์ เชียงใหม่, ช่างล้างแอร์ เชียงใหม่, ล้างแอร์บ้าน เชียงใหม่, ล้างแอร์คอนโด เชียงใหม่');

    const faqSchema = {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: seoFaqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: item.answer,
        },
      })),
    };

    const schemaId = 'landing-faq-schema';
    let schemaScript = document.getElementById(schemaId) as HTMLScriptElement | null;
    if (!schemaScript) {
      schemaScript = document.createElement('script');
      schemaScript.type = 'application/ld+json';
      schemaScript.id = schemaId;
      document.head.appendChild(schemaScript);
    }
    schemaScript.textContent = JSON.stringify(faqSchema);
  }, [seoDescription, seoTitle]);

  useEffect(() => {
    fetchProducts({ product_type: 'service', per_page: 12, sort_by: 'id', sort_order: 'desc' });
  }, [fetchProducts]);

  const serviceSlides = useMemo<ServiceSlide[]>(() => {
    const dbSlides = products
      .filter((product) => product.product_type === 'service')
      .map((product: Product) => {
        const coverImage = product.images?.find((image) => image.is_cover)?.image_path || product.images?.[0]?.image_path;
        const priceLabel =
          typeof product.price === 'number' && product.price > 0
            ? `${currencyFormatter.format(product.price)}.-`
            : 'สอบถามราคา';

        return {
          id: product.id,
          title: product.name,
          description:
            truncateText(
              product.description?.trim() ||
                'บริการดูแลเครื่องปรับอากาศโดยทีมช่างมืออาชีพ พร้อมตรวจเช็กก่อนเริ่มงาน',
              92,
            ),
          priceLabel,
          meta: product.category?.name || 'บริการแอร์ครบวงจร',
          image: coverImage ? getStorageUrl(coverImage) : fallbackServiceSlides[product.id % fallbackServiceSlides.length].image,
        };
      });

    if (dbSlides.length === 0) {
      return fallbackServiceSlides.slice(0, 5);
    }

    if (dbSlides.length >= 5) {
      return dbSlides.slice(0, 5);
    }

    const existingTitles = new Set(dbSlides.map((slide) => slide.title));
    const paddedFallbacks = fallbackServiceSlides
      .filter((slide) => !existingTitles.has(slide.title))
      .slice(0, Math.max(0, 5 - dbSlides.length));

    return [...dbSlides, ...paddedFallbacks].slice(0, 5);
  }, [products, getStorageUrl]);

  useEffect(() => {
    if (serviceSlides.length === 0) return;
    setFocusedServiceIndex((current) => Math.min(current, serviceSlides.length - 1));
  }, [serviceSlides]);

  useEffect(() => {
    if (serviceSlides.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setFocusedServiceIndex((current) => (current + 1) % serviceSlides.length);
    }, AUTO_SLIDE_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [serviceSlides.length]);

  useEffect(() => {
    const syncTestimonialItemsPerPage = () => {
      if (window.innerWidth < 768) {
        setTestimonialItemsPerPage(1);
        return;
      }

      if (window.innerWidth < 1200) {
        setTestimonialItemsPerPage(2);
        return;
      }

      setTestimonialItemsPerPage(3);
    };

    syncTestimonialItemsPerPage();
    window.addEventListener('resize', syncTestimonialItemsPerPage);

    return () => window.removeEventListener('resize', syncTestimonialItemsPerPage);
  }, []);

  const activeService = serviceSlides[focusedServiceIndex];

  const serviceCategoryBars = useMemo(() => {
    const categories = [
      { label: 'ล้างแอร์', keywords: ['ล้าง'] },
      { label: 'ซ่อมแอร์', keywords: ['ซ่อม'] },
      { label: 'ติดตั้งแอร์', keywords: ['ติดตั้ง'] },
    ];

    return categories.map((category) => {
      const count = serviceSlides.filter((slide) => {
        const haystack = `${slide.title} ${slide.description} ${slide.meta}`.toLowerCase();
        return category.keywords.some((keyword) => haystack.includes(keyword.toLowerCase()));
      }).length;

      const ratio = serviceSlides.length > 0 ? Math.round((count / serviceSlides.length) * 100) : 0;
      return {
        label: category.label,
        count,
        value: Math.max(count > 0 ? ratio : 0, 18),
      };
    });
  }, [serviceSlides]);

  const testimonialPages = useMemo(() => {
    const pages = [];

    for (let index = 0; index < testimonials.length; index += testimonialItemsPerPage) {
      pages.push(testimonials.slice(index, index + testimonialItemsPerPage));
    }

    return pages;
  }, [testimonialItemsPerPage]);

  useEffect(() => {
    if (testimonialPages.length === 0) return;
    setFocusedTestimonialPage((current) => Math.min(current, testimonialPages.length - 1));
  }, [testimonialPages]);

  useEffect(() => {
    if (testimonialPages.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setFocusedTestimonialPage((current) => (current + 1) % testimonialPages.length);
    }, TESTIMONIAL_AUTO_SLIDE_INTERVAL);

    return () => window.clearInterval(intervalId);
  }, [testimonialPages.length]);

  const nextServiceSlide = () => {
    setFocusedServiceIndex((current) => (current + 1) % serviceSlides.length);
  };

  const prevServiceSlide = () => {
    setFocusedServiceIndex((current) => (current - 1 + serviceSlides.length) % serviceSlides.length);
  };

  const nextTestimonialPage = () => {
    setFocusedTestimonialPage((current) => (current + 1) % testimonialPages.length);
  };

  const prevTestimonialPage = () => {
    setFocusedTestimonialPage((current) => (current - 1 + testimonialPages.length) % testimonialPages.length);
  };

  return (
    <div id="top" className="landing-page" data-theme={selectedTheme}>
      <header className="landing-header">
        <div className="container landing-nav">
          <a href="/" className="landing-brand" aria-label={brandName}>
            {brandLogoSrc && !brandLogoBroken ? (
              <img
                src={brandLogoSrc}
                alt={brandName}
                className="landing-brand-logo"
                onError={() => setBrandLogoBroken(true)}
              />
            ) : (
              <span className="landing-brand-mark">V</span>
            )}
            <span className="landing-brand-text">
              <strong>{brandName}</strong>
              <small>{brandTagline}</small>
            </span>
          </a>

          <nav className="landing-menu">
            <a href="#services">บริการ</a>
            <a href="#about">เกี่ยวกับเรา</a>
            <a href="#pricing">ราคา</a>
            <a href="#stories">รีวิว</a>
            <a href="#contact">ติดต่อ</a>
          </nav>

          <div className="landing-nav-actions">
            <label className="landing-theme-picker">
              <span>Theme</span>
              <select value={selectedTheme} onChange={(event) => setSelectedTheme(event.target.value as LandingTheme)}>
                {landingThemes.map((theme) => (
                  <option key={theme.value} value={theme.value}>
                    {theme.label}
                  </option>
                ))}
              </select>
            </label>

            <a className="btn landing-nav-btn" href={dashboardHref}>
              {user ? 'Dashboard' : 'จองคิว'}
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-section landing-hero">
          <div className="container">
            <div className="row align-items-center g-5">
              <div className="col-12 col-lg-6">
                <div className="landing-hero-copy">
                  <span className="landing-eyebrow">ล้างแอร์ เชียงใหม่</span>
                  <h1 className="landing-title">
                    <span className="landing-title-line">
                      <span className="landing-title-accent">ล้างแอร์ เชียงใหม่</span>
                    </span>
                    <span className="landing-title-line">ซ่อมแอร์ ติดตั้งแอร์</span>
                    <span className="landing-title-line">ครบวงจร นัดง่าย</span>
                    <span className="landing-title-line">ราคาแจ้งก่อน</span>
                  </h1>
                  <p className="landing-copy">
                    หากกำลังมองหาบริการล้างแอร์ เชียงใหม่ ที่นัดง่าย แจ้งราคาก่อน และเข้าบริการไว เราพร้อมดูแลทั้งบ้าน คอนโด ร้านค้า และสำนักงาน
                  </p>
                  <div className="landing-actions">
                    <a className="btn landing-btn-primary" href={dashboardHref}>
                      ขอรับบริการ
                    </a>
                    <a
                      className="btn landing-btn-secondary"
                      href="https://line.me/R/ti/p/@ptairservice"
                      target="_blank"
                      rel="noreferrer"
                    >
                      ติดต่อทาง Line
                    </a>
                  </div>
                </div>

                <div className="landing-hero-pills">
                  <span>
                    <i className="bi bi-patch-check-fill"></i>
                    ช่างมืออาชีพ
                  </span>
                  <span>
                    <i className="bi bi-lightning-charge-fill"></i>
                    เข้าบริการไว
                  </span>
                  <span>
                    <i className="bi bi-shield-check"></i>
                    ราคาโปร่งใส
                  </span>
                </div>

                <div className="landing-service-grid">
                  {serviceCards.map((item) => (
                    <article key={item.title} className="landing-service-card">
                      <div className="landing-service-icon">
                        <i className={`bi ${item.icon}`}></i>
                      </div>
                      <div>
                        <h3>{item.title}</h3>
                        <p>{item.text}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="landing-hero-visual">
                  <div className="landing-hero-backdrop"></div>
                  <div className="landing-doodle landing-doodle-top"></div>
                  <div className="landing-floating-badge landing-floating-badge-top">
                    <i className="bi bi-stars"></i>
                    ช่างล้างแอร์ เชียงใหม่
                  </div>
                  <div className="landing-floating-badge landing-floating-badge-left">
                    <strong>4.9/5 คะแนนรีวิว</strong>
                    <span>ลูกค้าประทับใจเรื่องความตรงเวลาและคุณภาพงาน</span>
                  </div>
                  <div className="landing-floating-badge landing-floating-badge-right">
                    <strong>พร้อมให้บริการในเชียงใหม่</strong>
                    <span>บ้าน คอนโด ร้านค้า และสำนักงาน</span>
                  </div>

                  <div className="landing-hero-showcase">
                    <div className="landing-showcase-top">
                      <span>PT Air Service</span>
                      <div className="landing-showcase-rating">
                        <i className="bi bi-star-fill"></i>
                        <strong>4.9</strong>
                      </div>
                    </div>

                    <div className="landing-ac-unit">
                      <div className="landing-ac-panel"></div>
                      <div className="landing-ac-vent">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>

                    <div className="landing-airflow">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>

                    <div className="landing-showcase-bottom">
                      <div className="landing-showcase-stat">
                        <strong>5,000+</strong>
                        <span>งานบริการ</span>
                      </div>
                      <div className="landing-showcase-stat">
                        <strong>10+</strong>
                        <span>ปีประสบการณ์</span>
                      </div>
                      <div className="landing-showcase-stat">
                        <strong>30 กม.</strong>
                        <span>รัศมีให้บริการ</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="about" className="landing-section landing-why-section">
          <div className="container">
            <div className="landing-center-heading landing-center-heading-tight" data-reveal="up">
              <span className="landing-section-label">Why Choose Us</span>
              <h2 className="landing-section-title">ทำไมต้อง PT AIR SERVICES</h2>
              <p className="landing-why-intro">
                ใส่ใจตั้งแต่นัดหมาย การตรวจเช็ก ไปจนถึงงานหลังบริการ เพื่อให้ลูกค้าสบายใจทุกครั้งที่เรียกใช้
              </p>
              <div className="landing-heading-underline"></div>
            </div>

            <div className="row g-4">
              {whyChooseUsCards.map((item, index) => (
                <div key={item.title} className="col-12 col-lg-4">
                  <article className="landing-why-card" data-reveal="up" data-reveal-delay={String(index * 90)}>
                    <div className="landing-why-card-top">
                      <div className="landing-why-icon">
                        <i className={`bi ${item.icon}`}></i>
                      </div>
                      <span className="landing-why-number">0{index + 1}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p>{item.text}</p>
                    <div className="landing-why-arrow">
                      <i className="bi bi-arrow-up-right"></i>
                    </div>
                  </article>
                </div>
              ))}
            </div>

            <div className="landing-why-strip">
              <div className="landing-why-strip-item" data-reveal="up" data-reveal-delay="0">
                <strong>คุณภาพงาน</strong>
                <span>ตรวจเช็กละเอียดและอธิบายตรงไปตรงมา</span>
              </div>
              <div className="landing-why-strip-item" data-reveal="up" data-reveal-delay="90">
                <strong>ตอบไว</strong>
                <span>ประสานงานง่าย นัดหมายสะดวกในเชียงใหม่</span>
              </div>
              <div className="landing-why-strip-item" data-reveal="up" data-reveal-delay="180">
                <strong>ไว้ใจได้</strong>
                <span>ราคาโปร่งใส พร้อมดูแลหลังจบงาน</span>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="landing-section landing-services-carousel-section">
          <div className="container">
            <div className="landing-center-heading landing-services-heading" data-reveal="up">
              <span className="landing-section-label">Our Services & Pricing</span>
              <h2 className="landing-section-title">บริการล้างแอร์ เชียงใหม่ และราคาเบื้องต้น</h2>
              <p className="landing-services-intro mx-auto">
                รวมบริการล้างแอร์ ซ่อมแอร์ และติดตั้งแอร์ในเชียงใหม่ พร้อมราคาเริ่มต้นให้ดูและเทียบได้ง่าย
              </p>
            </div>

            <div className="landing-services-showcase">
              <div className="landing-services-showcase-copy" data-reveal="left">
                <div className="landing-services-info-card landing-services-info-card-dark">
                  <strong>{String(serviceSlides.length).padStart(2, '0')}</strong>
                  <span>ตัวเลือกบริการหลัก</span>
                </div>

                <div className="landing-services-story">
                  <span className="landing-services-story-label">{activeService?.meta}</span>
                  <h3>{activeService?.title}</h3>
                  <p>{activeService?.description}</p>
                  <div className="landing-services-story-points">
                    <div>
                      <strong>{activeService?.priceLabel || 'สอบถามราคา'}</strong>
                      <span>ดูงบเริ่มต้นได้ทันที</span>
                    </div>
                    <div>
                      <strong>เช็กอาการก่อนลงมือ</strong>
                      <span>อธิบายงานให้เข้าใจก่อนเริ่ม</span>
                    </div>
                    <div>
                      <strong>เลือกแบบที่เหมาะกับเครื่อง</strong>
                      <span>ไม่ต้องเดาเองว่าควรล้างหรือซ่อม</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="landing-services-stage-shell" data-reveal="zoom" data-reveal-delay="70">
                <div className="landing-services-stage-glow landing-services-stage-glow-left"></div>
                <div className="landing-services-stage-glow landing-services-stage-glow-right"></div>

                <div className="landing-services-floating-card landing-services-floating-card-dark landing-services-floating-card-left">
                  <strong>{activeService?.priceLabel || 'สอบถามราคา'}</strong>
                  <span>เริ่มต้นตามบริการนี้</span>
                </div>

                <div className="landing-services-floating-card landing-services-floating-card-dark landing-services-floating-card-right">
                  <strong>10+</strong>
                  <span>ปีประสบการณ์</span>
                </div>

                <div className="landing-services-floating-card landing-services-floating-card-accent landing-services-floating-card-bottom">
                  <strong>30-90 วัน</strong>
                  <span>มีรับประกันตามประเภทงาน</span>
                </div>

                <div className="landing-services-stage">
                  <div className="landing-services-stage-blob"></div>
                  <div className="landing-services-stage-ring"></div>
                  <img src={activeService?.image} alt={activeService?.title} className="landing-services-stage-image" />
                  <span className="landing-services-stage-badge">{activeService?.meta}</span>
                </div>

                <div className="landing-services-stage-actions">
                  <button type="button" className="landing-carousel-btn" onClick={prevServiceSlide} aria-label="บริการก่อนหน้า">
                    <i className="bi bi-arrow-left"></i>
                  </button>
                  <a href="#contact" className="btn landing-btn-primary">
                    สอบถามบริการนี้
                  </a>
                  <button type="button" className="landing-carousel-btn" onClick={nextServiceSlide} aria-label="บริการถัดไป">
                    <i className="bi bi-arrow-right"></i>
                  </button>
                </div>
              </div>

              <div className="landing-services-showcase-side" data-reveal="right" data-reveal-delay="120">
                <div className="landing-services-info-card landing-services-info-card-accent">
                  <strong>ครบจบในที่เดียว</strong>
                  <span>ล้าง ซ่อม ติดตั้ง และย้ายแอร์</span>
                </div>

                <div className="landing-services-progress-card">
                  <h3>ภาพรวมประเภทบริการ</h3>
                  <div className="landing-services-progress-list">
                    {serviceCategoryBars.map((item) => (
                      <div key={item.label} className="landing-services-progress-item">
                        <div className="landing-services-progress-head">
                          <span>{item.label}</span>
                          <strong>{item.count} รายการ</strong>
                        </div>
                        <div className="landing-services-progress-bar">
                          <span style={{ width: `${item.value}%` }}></span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="landing-services-note-card">
                  <strong>ยังไม่แน่ใจว่าควรเลือกแบบไหนดี?</strong>
                  <p>ทักมาสอบถามก่อนได้เลย แล้วค่อยเลือกบริการให้เหมาะกับอาการและงบของคุณ</p>
                </div>
              </div>
            </div>

            <div className="landing-services-selector-grid" role="tablist" aria-label="เลือกบริการ" data-reveal="up" data-reveal-delay="160">
              {serviceSlides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  className={`landing-services-selector ${index === focusedServiceIndex ? 'is-active' : ''}`}
                  onClick={() => setFocusedServiceIndex(index)}
                  aria-label={`แสดงบริการ ${slide.title}`}
                  aria-pressed={index === focusedServiceIndex}
                >
                  <img src={slide.image} alt={slide.title} className="landing-services-selector-image" />
                  <div className="landing-services-selector-body">
                    <span>{slide.meta}</span>
                    <strong>{slide.title}</strong>
                    <small>{slide.priceLabel}</small>
                  </div>
                </button>
              ))}
            </div>

            <div className="landing-services-bottom-rail" data-reveal="up" data-reveal-delay="220">
              <div className="landing-services-active-meta">
                <span className="landing-services-active-label">บริการที่กำลังแสดง</span>
                <strong>{activeService?.title}</strong>
              </div>
              <div className="landing-services-dots" role="tablist" aria-label="เลือกบริการ">
                {serviceSlides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    className={`landing-services-dot ${index === focusedServiceIndex ? 'is-active' : ''}`}
                    onClick={() => setFocusedServiceIndex(index)}
                    aria-label={`แสดงบริการ ${slide.title}`}
                    aria-pressed={index === focusedServiceIndex}
                  />
                ))}
              </div>
            </div>

            <div id="pricing" className="landing-services-unified">
              <div className="landing-services-block" data-reveal="up">
                <div className="landing-services-block-head">
                  <span className="landing-section-label">Wall Mounted Cleaning</span>
                  <h3 className="landing-services-block-title">ล้างแอร์ เชียงใหม่ ราคาเริ่มต้นสำหรับแอร์ติดผนัง</h3>
                  <p className="landing-services-block-intro">
                    เลือกแพ็กเกจล้างให้เหมาะกับอาการและความสกปรกของแอร์ ตั้งแต่งานล้างทั่วไปไปจนถึงล้างลึก
                  </p>
                </div>

                <div className="row g-4">
                  {pricingPlans.map((plan, index) => (
                    <div key={plan.name} className="col-12 col-md-6 col-xl-4">
                      <article
                        className={`landing-price-card landing-price-card-${plan.tone}`}
                        data-reveal="up"
                        data-reveal-delay={String(PRICING_REVEAL_RHYTHM[index] ?? index * 90)}
                      >
                        <span className="landing-price-label">{plan.name}</span>
                        <h3>{plan.price}</h3>
                        <p>{plan.description}</p>
                        <ul>
                          {plan.items.map((item) => (
                            <li key={item}>
                              <i className="bi bi-check-circle-fill"></i>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        <a href="#contact" className="btn landing-price-btn">
                          นัดหมายประเมิน
                        </a>
                      </article>
                    </div>
                  ))}
                </div>

                <div className="landing-pricing-note">
                  <div className="landing-pricing-note-item">
                    <i className="bi bi-info-circle-fill"></i>
                    <span>แอร์ติดผนังขนาด 20,000 - 25,000 BTU เพิ่ม 200 บาท</span>
                  </div>
                  <div className="landing-pricing-note-item">
                    <i className="bi bi-droplet-half"></i>
                    <span>หากยังไม่แน่ใจว่าควรล้างแบบไหน สามารถส่งรูปหรือแจ้งอาการเพื่อให้ช่วยแนะนำก่อนได้</span>
                  </div>
                </div>
              </div>

              <div className="landing-services-block landing-services-block-install" data-reveal="up" data-reveal-delay="80">
                <div className="landing-services-block-head">
                  <span className="landing-section-label">Air Conditioner Packages</span>
                  <h3 className="landing-services-block-title">ราคาแอร์ Inverter R32 พร้อมติดตั้ง</h3>
                  <p className="landing-services-block-intro">
                    เปรียบเทียบราคาแอร์พร้อมติดตั้งตามขนาด BTU ได้ง่าย เลือกงบที่เหมาะกับห้องของคุณได้ทันที
                  </p>
                </div>

                <div className="row g-4">
                  {inverterPackages.map((pkg, index) => (
                    <div key={pkg.btu} className="col-12 col-md-6 col-xl-3">
                      <article
                        className="landing-install-card"
                        data-reveal="up"
                        data-reveal-delay={String(INSTALL_REVEAL_RHYTHM[index] ?? index * 82)}
                      >
                        <span className="landing-price-label">{pkg.btu}</span>
                        <h3>{pkg.priceRange}</h3>
                        <ul>
                          {pkg.highlights.map((item) => (
                            <li key={item}>
                              <i className="bi bi-check-circle-fill"></i>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                        <a href="#contact" className="btn landing-btn-primary">
                          ขอราคาเต็ม
                        </a>
                      </article>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section landing-section-alt">
          <div className="container">
            <div className="landing-center-heading" data-reveal="up">
              <span className="landing-section-label">Our Experience</span>
              <h2 className="landing-section-title">เราดูแลงานแอร์อย่างมืออาชีพ</h2>
            </div>

            <div className="row align-items-center g-4">
              <div className="col-12 col-lg-3">
                <div className="landing-stat-card landing-stat-card-dark" data-reveal="left">
                  <strong>5,000+</strong>
                  <span>ลูกค้าที่ใช้บริการแล้ว</span>
                  <p>ลูกค้าไว้วางใจให้ดูแลงานล้าง ซ่อม และติดตั้งอย่างต่อเนื่อง</p>
                </div>
                <div className="landing-stat-card landing-stat-card-accent mt-3" data-reveal="left" data-reveal-delay="90">
                  <strong>4.9/5</strong>
                  <span>คะแนนความพึงพอใจ</span>
                  <p>เน้นงานคุณภาพ ตรงเวลา และบริการเข้าใจง่าย</p>
                </div>
              </div>

              <div className="col-12 col-lg-6">
                <div className="landing-metric-visual" data-reveal="zoom" data-reveal-delay="80">
                  <div className="landing-blob landing-blob-primary"></div>
                  <img src={metricImage} alt="Business growth" className="landing-person-image landing-metric-image" />
                </div>
              </div>

              <div className="col-12 col-lg-3">
                <div className="landing-stat-card landing-stat-card-dark" data-reveal="right">
                  <strong>10+</strong>
                  <span>ปีประสบการณ์</span>
                  <p>ดูแลงานแอร์ทั้งบ้านพักอาศัยและงานธุรกิจ</p>
                </div>
                <div className="landing-progress-card mt-3" data-reveal="right" data-reveal-delay="90">
                  <div>
                    <span>คุณภาพงานบริการ</span>
                    <strong>92%</strong>
                  </div>
                  <div className="landing-progress">
                    <span style={{ width: '92%' }}></span>
                  </div>
                  <div>
                    <span>ความตรงต่อเวลา</span>
                    <strong>81%</strong>
                  </div>
                  <div className="landing-progress">
                    <span style={{ width: '81%' }}></span>
                  </div>
                  <div>
                    <span>ความพึงพอใจลูกค้า</span>
                    <strong>88%</strong>
                  </div>
                  <div className="landing-progress">
                    <span style={{ width: '88%' }}></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="container">
            <div className="landing-center-heading landing-center-heading-tight" data-reveal="up">
              <span className="landing-section-label">Real Projects</span>
              <h2 className="landing-section-title">ผลงานจริงหน้างานในเชียงใหม่</h2>
              <p className="landing-services-intro mx-auto">
                ตัวอย่างงานติดตั้ง ล้าง และดูแลแอร์จากหน้างานจริง เพื่อให้เห็นมาตรฐานงานก่อนตัดสินใจใช้บริการ
              </p>
            </div>

            <div className="landing-work-overview" data-reveal="up" data-reveal-delay="70">
              <div className="landing-work-overview-card">
                <span className="landing-work-overview-kicker">10 ภาพหน้างานจริง</span>
                <strong>รวมตัวอย่างงานติดตั้ง ล้าง และดูแลแอร์จากบ้าน คอนโด ร้านค้า และหน้างานจริงในเชียงใหม่</strong>
              </div>
              <div className="landing-work-overview-tags">
                <span>ติดตั้งแอร์</span>
                <span>ล้างแอร์</span>
                <span>สำรวจหน้างาน</span>
                <span>เก็บงานเรียบร้อย</span>
              </div>
            </div>

            <div className="landing-work-gallery">
              {workGalleryItems.map((item, index) => (
                <article
                  key={item.image}
                  className={`landing-work-card ${
                    index === 0
                      ? 'landing-work-card-feature'
                      : index === 1 || index === 2
                        ? 'landing-work-card-wide'
                        : index === 3
                          ? 'landing-work-card-tall'
                          : 'landing-work-card-regular'
                  }`}
                  data-reveal="up"
                  data-reveal-delay={String(GALLERY_REVEAL_RHYTHM[index] ?? index * 72)}
                >
                  <div className="landing-work-image-wrap">
                    <img src={item.image} alt={item.title} className="landing-work-image" />
                    <div className="landing-work-image-overlay"></div>
                    <div className="landing-work-card-top">
                      <span className="landing-work-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="landing-work-badge">{item.category}</span>
                    </div>
                    <div
                      className={`landing-work-copy ${
                        index === 0 ? 'landing-work-copy-feature' : 'landing-work-copy-compact'
                      }`}
                    >
                      {index === 0 ? <span className="landing-work-feature-kicker">ผลงานเด่น</span> : null}
                      <h3>{item.title}</h3>
                      {index === 0 ? <p>{item.text}</p> : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="container">
            <div className="landing-center-heading landing-center-heading-tight" data-reveal="up">
              <span className="landing-section-label">FAQ</span>
              <h2 className="landing-section-title">คำถามที่พบบ่อยเกี่ยวกับล้างแอร์ เชียงใหม่</h2>
              <p className="landing-services-intro mx-auto">
                รวมคำถามที่ลูกค้ามักใช้ตัดสินใจก่อนเรียกช่างล้างแอร์ในเชียงใหม่
              </p>
            </div>

            <div className="landing-seo-faq-grid">
              {seoFaqs.map((item, index) => (
                <article key={item.question} className="landing-seo-faq-card" data-reveal="up" data-reveal-delay={String(index * 80)}>
                  <h3>{item.question}</h3>
                  <p>{item.answer}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="stories" className="landing-section landing-section-alt">
          <div className="container">
            <div className="landing-testimonial-header" data-reveal="up">
              <div className="landing-center-heading landing-testimonial-heading">
                <span className="landing-section-label">Testimonials</span>
                <h2 className="landing-section-title">เสียงจากลูกค้าของเรา</h2>
                <p className="landing-services-intro mx-auto">
                  เสียงตอบรับจากลูกค้าที่ใช้บริการจริง ทั้งงานล้าง ซ่อม และติดตั้งแอร์
                </p>
              </div>

              <div className="landing-testimonial-controls">
                <button type="button" className="landing-carousel-btn" onClick={prevTestimonialPage} aria-label="รีวิวก่อนหน้า">
                  <i className="bi bi-arrow-left"></i>
                </button>
                <button type="button" className="landing-carousel-btn" onClick={nextTestimonialPage} aria-label="รีวิวถัดไป">
                  <i className="bi bi-arrow-right"></i>
                </button>
              </div>
            </div>

            <div className="landing-testimonial-slider">
              <div
                className="landing-testimonial-track"
                style={{ transform: `translateX(-${focusedTestimonialPage * 100}%)` }}
              >
                {testimonialPages.map((page, pageIndex) => (
                  <div
                    key={`testimonial-page-${pageIndex}`}
                    className="landing-testimonial-page"
                    style={{ gridTemplateColumns: `repeat(${page.length}, minmax(0, 1fr))` }}
                  >
                    {page.map((item, index) => (
                      <article
                        key={`${item.name}-${item.role}`}
                        className="landing-testimonial-card"
                        data-reveal="up"
                        data-reveal-delay={String(index * 90)}
                      >
                        <div className="landing-stars">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <i key={index} className="bi bi-star-fill"></i>
                          ))}
                        </div>
                        <p>{item.text}</p>
                        <div className="landing-testimonial-author">
                          <div className="landing-testimonial-avatar">{item.name.slice(-2)}</div>
                          <div>
                            <span>{item.name}</span>
                            <small>{item.role}</small>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="landing-testimonial-footer">
              <div className="landing-testimonial-dots" role="tablist" aria-label="เลือกหน้ารีวิว">
                {testimonialPages.map((_, index) => (
                  <button
                    key={`testimonial-dot-${index}`}
                    type="button"
                    className={`landing-testimonial-dot ${index === focusedTestimonialPage ? 'is-active' : ''}`}
                    onClick={() => setFocusedTestimonialPage(index)}
                    aria-label={`แสดงรีวิวหน้า ${index + 1}`}
                    aria-pressed={index === focusedTestimonialPage}
                  />
                ))}
              </div>
              <span className="landing-testimonial-counter">
                {String(focusedTestimonialPage + 1).padStart(2, '0')} / {String(testimonialPages.length).padStart(2, '0')}
              </span>
            </div>
          </div>
        </section>

        <section className="landing-section">
          <div className="container">
            <div className="row align-items-center g-5">
              <div className="col-12 col-lg-5">
                <div className="landing-photo-stack" data-reveal="left">
                  <div className="landing-blob landing-blob-primary"></div>
                  <img src={faqImage} alt="Customer support" className="landing-person-image landing-person-image-small" />
                </div>
              </div>

              <div className="col-12 col-lg-7">
                <span className="landing-section-label" data-reveal="up">Service Process</span>
                <h2 className="landing-section-title" data-reveal="up" data-reveal-delay="60">ล้างแอร์ เชียงใหม่ แบบไหนที่เราให้บริการ</h2>
                <div className="landing-faq-list">
                  {serviceProcessItems.map((item, index) => (
                    <div key={item} className="landing-faq-item" data-reveal="up" data-reveal-delay={String(index * 80)}>
                      <i className="bi bi-check2-circle"></i>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="landing-section landing-section-cta">
          <div className="container">
            <div className="landing-contact-shell" data-reveal="up">
              <div className="landing-contact-orb landing-contact-orb-left"></div>
              <div className="landing-contact-orb landing-contact-orb-right"></div>

              <div className="landing-contact-layout">
                <div className="landing-contact-panel" data-reveal="left">
                  <div className="landing-contact-heading">
                    <span className="landing-section-label landing-section-label-light">Contact Us</span>
                    <h2 className="landing-section-title landing-section-title-sm landing-section-title-light">ติดต่อเรา</h2>
                    <p className="landing-contact-intro">โทรหรือทัก Line เพื่อสอบถามราคา แจ้งอาการแอร์ และนัดวันเข้าบริการได้เลย</p>
                  </div>

                  <div className="landing-contact-highlight-row">
                    <div className="landing-contact-highlight">
                      <i className="bi bi-lightning-charge-fill"></i>
                      <span>ตอบไว</span>
                    </div>
                    <div className="landing-contact-highlight">
                      <i className="bi bi-shield-check"></i>
                      <span>แจ้งราคาก่อน</span>
                    </div>
                    <div className="landing-contact-highlight">
                      <i className="bi bi-geo-alt-fill"></i>
                      <span>เข้าถึงหน้างาน</span>
                    </div>
                  </div>

                  <div className="landing-contact-list">
                    <div className="landing-contact-row">
                      <div className="landing-contact-icon">
                        <i className="bi bi-geo-alt-fill"></i>
                      </div>
                      <div className="landing-contact-copy">
                        <span>พื้นที่ให้บริการ</span>
                        <strong>ตัวเมืองเชียงใหม่ และพื้นที่โดยรอบ 30 กม.</strong>
                      </div>
                    </div>
                    <div className="landing-contact-row">
                      <div className="landing-contact-icon">
                        <i className="bi bi-telephone-fill"></i>
                      </div>
                      <div className="landing-contact-copy">
                        <span>โทรศัพท์</span>
                        <strong>
                          <a href="tel:0966605385">096-660-5385</a>
                        </strong>
                      </div>
                    </div>
                    <div className="landing-contact-row">
                      <div className="landing-contact-icon">
                        <i className="bi bi-chat-left-text-fill"></i>
                      </div>
                      <div className="landing-contact-copy">
                        <span>Line ID</span>
                        <strong>
                          <a href={lineContactUrl} target="_blank" rel="noreferrer">
                            @ptairservice
                          </a>
                        </strong>
                      </div>
                    </div>
                    <div className="landing-contact-row">
                      <div className="landing-contact-icon">
                        <i className="bi bi-clock-fill"></i>
                      </div>
                      <div className="landing-contact-copy">
                        <span>เวลาทำการ</span>
                        <strong>จันทร์ - เสาร์: 08:30 - 17:30 น.</strong>
                      </div>
                    </div>
                  </div>

                  <div className="landing-contact-cta-grid">
                    <div className="landing-mini-cta landing-mini-cta-primary">
                      <p>ต้องการนัดวันล้าง ซ่อม หรือติดตั้งแอร์ กดจองคิวได้เลย</p>
                      <a href={dashboardHref} className="btn landing-contact-btn landing-contact-btn-primary">
                        จองคิวบริการ
                      </a>
                    </div>
                    <div className="landing-mini-cta landing-mini-cta-success">
                      <p>อยากถามราคา หรือส่งรูปอาการแอร์ ทัก Line ได้เลย</p>
                      <a
                        href={lineContactUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn landing-contact-btn landing-contact-btn-success"
                      >
                        <i className="bi bi-chat-square-text"></i>
                        ติดต่อ Line
                      </a>
                    </div>
                  </div>

                  <div className="landing-contact-qr-card">
                    <div className="landing-contact-qr-copy">
                      <span className="landing-contact-qr-label">Scan Line</span>
                      <h3>สแกนเพิ่มเพื่อน Line ได้เลย</h3>
                      <a href={lineContactUrl} target="_blank" rel="noreferrer" className="landing-contact-qr-link">
                        เปิดแชต Line
                        <i className="bi bi-arrow-up-right"></i>
                      </a>
                    </div>

                    <a
                      href={lineContactUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="landing-contact-qr-frame"
                      aria-label="สแกนหรือเปิด Line PT Air Service"
                    >
                      <img src={lineQrCodeUrl} alt="QR Code สำหรับติดต่อ Line PT Air Service" className="landing-contact-qr-image" />
                    </a>
                  </div>
                </div>

                <div className="landing-map-panel" data-reveal="right" data-reveal-delay="90">
                  <div className="landing-map-frame">
                    <iframe
                      title="PT Air Service Map"
                      src="https://www.google.com/maps?q=Chiang%20Mai%20Thailand&z=10&output=embed"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                    <div className="landing-map-overlay">
                      <strong>Chiang Mai Service Area</strong>
                      <span>บริการล้าง ซ่อม และติดตั้งแอร์ ในเชียงใหม่และใกล้เคียง</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="landing-footer">
          <div className="container">
            <div className="landing-footer-shell">
              <div className="landing-footer-brand">
                <a href="#top" className="landing-footer-brand-link" aria-label={brandName}>
                  {brandLogoSrc && !brandLogoBroken ? (
                    <img
                      src={brandLogoSrc}
                      alt={brandName}
                      className="landing-footer-logo"
                      onError={() => setBrandLogoBroken(true)}
                    />
                  ) : (
                    <span className="landing-footer-mark">V</span>
                  )}
                  <span className="landing-footer-brand-copy">
                    <strong>{brandName}</strong>
                    <small>{brandTagline}</small>
                  </span>
                </a>
                <p>{brandTagline}</p>
              </div>

              <div className="landing-footer-column">
                <span className="landing-footer-heading">เมนูลัด</span>
                <div className="landing-footer-links">
                  <a href="#services">บริการ</a>
                  <a href="#about">เกี่ยวกับเรา</a>
                  <a href="#pricing">ราคา</a>
                  <a href="#stories">รีวิว</a>
                  <a href="#contact">ติดต่อ</a>
                </div>
              </div>

              <div className="landing-footer-column">
                <span className="landing-footer-heading">ติดต่อ</span>
                <div className="landing-footer-contact">
                  <a href="tel:0966605385">096-660-5385</a>
                  <a href="https://line.me/R/ti/p/@ptairservice" target="_blank" rel="noreferrer">
                    @ptairservice
                  </a>
                  <span>เชียงใหม่และพื้นที่โดยรอบ</span>
                </div>
                <a href="#contact" className="landing-footer-cta">
                  ขอรับบริการ
                </a>
              </div>
            </div>

            <div className="landing-footer-bottom">
              <span>{brandName} | Air Service Chiang Mai</span>
              <a href="#top">กลับขึ้นบน</a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
