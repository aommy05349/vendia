<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use App\Models\Warehouse;
use Carbon\Carbon;

class ServiceProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $category = Category::firstOrCreate(
            ['name' => 'การบริการ'],
            ['description' => 'All Service']
        );

        $warehouse = Warehouse::firstOrCreate(
            ['name' => 'Main Warehouse'],
            [
                'address' => '123 Main St, New York, NY 10001',
                'phone' => '123-456-7890',
                'email' => 'warehouse1@vendia.com',
            ]
        );

        $unit = Unit::firstOrCreate(
            ['short_name' => 'เครื่อง'],
            ['name' => 'เครื่อง', 'short_name' => 'เครื่อง']
        );

        $services = [
            [
                'name' => 'รับเทิร์นแอร์เก่าพร้อมรื้อถอน',
                'price' => -500.00, // Negative price for deduction example
                'description' => 'รับเทิร์นแอร์เก่าพร้อมรื้อถอน',
            ],
            [
                'name' => 'ลูกค้าชำระค่ามัดจำสินค้าล่วงหน้า',
                'price' => -1000.00, // Negative for deduction logic in POS if used as payment credit, or positive if it's a charge. 
                                     // The user said "ค่ามัดจําสินค้า ต้องลบออกจาก ค่าบริการ" implying it's a deduction from the total bill in some context?
                                     // Or maybe "Customer pays deposit" -> This adds money to the system.
                                     // But "ค่ามัดจําสินค้า ต้องลบออกจาก ค่าบริการ" suggests using it as a discount/deduction line item.
                                     // I will set it to negative as a default "Deposit Deduction" item.
                                     // If they want to CHARGE deposit, they can edit price to positive.
                'description' => 'หักเงินมัดจำ',
            ],
            [
                'name' => 'ค่าแรงติดตั้งระบบ',
                'price' => 2000.00,
                'description' => 'ค่าแรงติดตั้งระบบ',
            ],
            [
                'name' => 'ค่าบริการรื้อผนัง',
                'price' => 500.00,
                'description' => 'ค่าบริการรื้อผนัง',
            ],
            [
                'name' => 'ค่าบริการรื้อย้ายล้างติดตั้งม่านอากาศ (รวมอุปกรณ์)',
                'price' => 1500.00,
                'description' => 'ค่าบริการรื้อย้ายล้างติดตั้งม่านอากาศ (รวมอุปกรณ์)',
            ],
            [
                'name' => 'ค่าบริการรื้อย้ายล้างติดตั้งม่านอากาศ (ไม่รวมอุปกรณ์)',
                'price' => 1000.00,
                'description' => 'ค่าบริการรื้อย้ายล้างติดตั้งม่านอากาศ (ไม่รวมอุปกรณ์)',
            ],
            [
                'name' => 'ค่าบริการรื้อ ย้าย ติดตั้งระบบแอร์ติดผนัง 9000-12000 BTU',
                'price' => 2500.00,
                'description' => 'ค่าบริการรื้อ ย้าย ติดตั้งระบบแอร์ติดผนัง 9000-12000 BTU',
            ],
            [
                'name' => 'ค่าบริการรื้อ ย้าย ติดตั้งระบบแอร์ติดผนัง 18000-24000 BTU',
                'price' => 3500.00,
                'description' => 'ค่าบริการรื้อ ย้าย ติดตั้งระบบแอร์ติดผนัง 18000-24000 BTU',
            ],
            [
                'name' => 'ล้างแอร์ (อัดโฟม) แอร์ติดผนัง',
                'price' => 500.00,
                'description' => "ล้างอัดโฟม แอร์ติดผนัง\nรับประกัน 30 วัน",
            ],
            [
                'name' => 'ล้างแอร์ (แก้น้ำหยด) แอร์ติดผนัง',
                'price' => 600.00,
                'description' => "ล้างแก้น้ำหยด แอร์ติดผนัง\nรับประกัน 30 วัน",
            ],
            [
                'name' => 'ล้างแอร์ (ดับกลิ่นอับ) แอร์ติดผนัง',
                'price' => 600.00,
                'description' => "ล้างดับกลิ่นอับ แอร์ติดผนัง\nรับประกัน 30 วัน",
            ],
            [
                'name' => 'ล้างแอร์ (ถอดโบลเวอร์) แอร์ติดผนัง',
                'price' => 700.00,
                'description' => "ล้างถอดโบลเวอร์ แอร์ติดผนัง\nรับประกัน 30 วัน",
            ],
            [
                'name' => 'ล้างแอร์ (ล้างใหญ่ถอดละเอียด) แอร์ติดผนัง',
                'price' => 1500.00,
                'description' => "ล้างใหญ่ถอดละเอียด แอร์ติดผนัง\nรับประกัน 90 วัน",
            ],
            [
                'name' => 'ตัดล้างแฟนคอยล์ (เริ่มต้น)',
                'price' => 2500.00,
                'description' => "ตัดล้างแฟนคอยล์\nรับประกัน 90 วัน",
            ],
            [
                'name' => 'ตัดล้างแฟนคอยล์ (กรณี 3,000)',
                'price' => 3000.00,
                'description' => "ตัดล้างแฟนคอยล์\nรับประกัน 90 วัน",
            ],
            [
                'name' => 'ค่าเดินทาง (ล้างแอร์ 1 เครื่อง)',
                'price' => 100.00,
                'description' => 'ค่าเดินทาง (กรณีล้าง 1 เครื่อง)',
            ],
            [
                'name' => 'ค่าเพิ่ม BTU 20,000-25,000 (ล้างแอร์)',
                'price' => 200.00,
                'description' => 'ค่าเพิ่มสำหรับแอร์ติดผนังขนาด 20,000-25,000 BTU',
            ],
            [
                'name' => 'ค่าบริการล้างแอร์วินเวย์',
                'price' => 1500.00,
                'description' => 'ค่าบริการล้างแอร์วินเวย์',
            ],
            [
                'name' => 'ค่าบริการล้างแอร์แขวน',
                'price' => 1500.00,
                'description' => 'ค่าบริการล้างแอร์แขวน',
            ],
            [
                'name' => 'ค่าบริการล้างแอร์ 4 ทิศทาง',
                'price' => 1500.00,
                'description' => 'ค่าบริการล้างแอร์ 4 ทิศทาง',
            ],
        ];

        foreach ($services as $index => $service) {
            $sku = 'SVC-' . str_pad($index + 1, 4, '0', STR_PAD_LEFT);

            Product::updateOrCreate(
                ['sku' => $sku],
                [
                    'name' => $service['name'],
                    'slug' => Str::slug($service['name']) . '-' . Str::random(5),
                    'description' => $service['description'],
                    'price' => $service['price'],
                    'stock' => 0,
                    'category_id' => $category->id,
                    'warehouse_id' => $warehouse->id,
                    'unit_id' => $unit->id,
                    'brand_id' => null,
                    'barcode_symbology' => 'Code128',
                    'barcode' => $sku,
                    'product_type' => 'service',
                    'tax_type' => 'exclusive',
                    'tax_amount' => 0,
                    'discount_type' => 'fixed',
                    'discount_value' => 0,
                    'quantity_alert' => 0,
                ]
            );
        }
    }
}
