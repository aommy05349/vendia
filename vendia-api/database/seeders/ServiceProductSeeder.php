<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use App\Models\Product;
use Carbon\Carbon;

class ServiceProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ensure Service category exists (it should, id=12 based on check)
        // If not, we might want to fetch it dynamically, but for now hardcoding or fetching is fine.
        $categoryId = DB::table('categories')->where('name', 'Service')->value('id');
        
        if (!$categoryId) {
            $categoryId = DB::table('categories')->insertGetId([
                'name' => 'Service',
                'description' => 'All Service',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }

        $services = [
            [
                'name' => 'รับเทิร์นแอร์เก่าพร้อมรื้อถอน',
                'price' => -500.00, // Negative price for deduction example
                'description' => 'Turn-in old AC with dismantling',
            ],
            [
                'name' => 'ลูกค้าชำระค่ามัดจำสินค้าล่วงหน้า',
                'price' => -1000.00, // Negative for deduction logic in POS if used as payment credit, or positive if it's a charge. 
                                     // The user said "ค่ามัดจําสินค้า ต้องลบออกจาก ค่าบริการ" implying it's a deduction from the total bill in some context?
                                     // Or maybe "Customer pays deposit" -> This adds money to the system.
                                     // But "ค่ามัดจําสินค้า ต้องลบออกจาก ค่าบริการ" suggests using it as a discount/deduction line item.
                                     // I will set it to negative as a default "Deposit Deduction" item.
                                     // If they want to CHARGE deposit, they can edit price to positive.
                'description' => 'Deposit Deduction',
            ],
            [
                'name' => 'ค่าแรงติดตั้งระบบ',
                'price' => 2000.00,
                'description' => 'System installation labor',
            ],
            [
                'name' => 'ค่าบริการรื้อผนัง',
                'price' => 500.00,
                'description' => 'Wall dismantling service',
            ],
            [
                'name' => 'ค่าบริการรื้อย้ายล้างติดตั้งม่านอากาศ (รวมอุปกรณ์)',
                'price' => 1500.00,
                'description' => 'Air curtain service (Inc. equipment)',
            ],
            [
                'name' => 'ค่าบริการรื้อย้ายล้างติดตั้งม่านอากาศ (ไม่รวมอุปกรณ์)',
                'price' => 1000.00,
                'description' => 'Air curtain service (Exc. equipment)',
            ],
            [
                'name' => 'ค่าบริการรื้อ ย้าย ติดตั้งระบบแอร์ติดผนัง 9000-12000 BTU',
                'price' => 2500.00,
                'description' => 'Wall type AC service 9000-12000 BTU',
            ],
            [
                'name' => 'ค่าบริการรื้อ ย้าย ติดตั้งระบบแอร์ติดผนัง 18000-24000 BTU',
                'price' => 3500.00,
                'description' => 'Wall type AC service 18000-24000 BTU',
            ],
        ];

        foreach ($services as $index => $service) {
            $sku = 'SVC-' . str_pad($index + 1, 4, '0', STR_PAD_LEFT);
            
            // Check if exists
            if (Product::where('sku', $sku)->exists()) {
                continue;
            }

            Product::create([
                'name' => $service['name'],
                'slug' => Str::slug($service['name']) . '-' . Str::random(5),
                'description' => $service['description'],
                'price' => $service['price'],
                'stock' => 0, // Service has no stock
                'sku' => $sku,
                'category_id' => $categoryId,
                'warehouse_id' => 1, // Default warehouse
                'unit_id' => 2, // Unit
                'brand_id' => null,
                'barcode_symbology' => 'Code128',
                'barcode' => $sku,
                'product_type' => 'service',
                'tax_type' => 'exclusive',
                'tax_amount' => 0,
                'discount_type' => 'fixed',
                'discount_value' => 0,
                'quantity_alert' => 0,
            ]);
        }
    }
}
