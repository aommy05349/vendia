<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Shop;

class ShopSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Shop::updateOrCreate(
            ['id' => 1],
            [
                'name' => 'PT AIR CHIANGMAI',
                'company_name' => 'ห้างหุ้นส่วนจำกัด  ช่างกันต์พีทีแอร์เชียงใหม่  (สำนักงานใหญ่)',
                'bank_details' => "โอนธนาคารกสิกรไทย (สาขาเซ็นทรัล เชียงใหม่)\nชื่อบัญชี ห้างหุ้นส่วนจำกัด ช่างกันต์พีทีแอร์เชียงใหม่\nเลขที่บัญชี  215-1-32737-3",
                'address' => 'เลขที่ 181/78 หมู่ที่ 6 ตำบลสันพระเนตร อำเภอสันทราย จังหวัดเชียงใหม่ 50210',
                'phone' => '065-4868997',
                'tax_id' => '0503568004939',
                'email' => 'aommy05349@gmail.com',
                'website' => null,
                'footer_text' => 'พีทีแอร์....ดูแลแอร์....ดูแลคุณ...และคนที่คุณรัก ขอบคุณลูกค้าที่ไว้วางใจเรียกใช้บริการครับ/ค่ะ',
                'remarks' => "ซ่อม รับประกัน 3 เดือน\nล้างรับประกันน้ำหยดหลังล้าง 30 วัน\nติดตั้งระบบ รับประกัน 1 ปี",
                'logo_path' => null,
                'signature_path' => null,
            ]
        );
    }
}
