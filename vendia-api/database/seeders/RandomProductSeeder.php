<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Category;
use App\Models\Brand;
use App\Models\Unit;
use App\Models\Warehouse;
use Illuminate\Support\Str;
use Illuminate\Database\Seeder;

class RandomProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (Warehouse::count() == 0) {
            Warehouse::factory()->count(1)->create();
        }

        $warehouse = Warehouse::first();

        $categoryMap = [
            'wall' => Category::where('name', 'แอร์ติดผนัง')->first(),
            'ceiling' => Category::where('name', 'แอร์แขวนใต้ฝ้า')->first(),
            'cassette' => Category::where('name', 'แอร์ฝังฝ้า 4 ทิศทาง')->first(),
            'floor' => Category::where('name', 'แอร์ตู้ตั้งพื้น')->first(),
            'duct' => Category::where('name', 'แอร์เปลือย / แอร์ต่อท่อลม')->first(),
            'vrv' => Category::where('name', 'ระบบแอร์ VRV/VRF')->first(),
            'portable' => Category::where('name', 'แอร์เคลื่อนที่')->first(),
            'install' => Category::where('name', 'อุปกรณ์ติดตั้ง')->first(),
            'spare' => Category::where('name', 'อะไหล่แอร์')->first(),
            'tools' => Category::where('name', 'เครื่องมือช่าง')->first(),
        ];

        $brandMap = [
            'daikin' => Brand::where('name', 'Daikin')->first(),
            'mitsubishi' => Brand::where('name', 'Mitsubishi Electric')->first(),
            'carrier' => Brand::where('name', 'Carrier')->first(),
            'panasonic' => Brand::where('name', 'Panasonic')->first(),
            'saijo' => Brand::where('name', 'Saijo Denki')->first(),
            'centralair' => Brand::where('name', 'Central Air')->first(),
        ];

        $units = [
            'set' => Unit::where('short_name', 'set')->first() ?: Unit::firstOrCreate(['name' => 'Set', 'short_name' => 'set']),
            'unit' => Unit::where('short_name', 'unit')->first() ?: Unit::firstOrCreate(['name' => 'Unit', 'short_name' => 'unit']),
            'roll' => Unit::where('short_name', 'roll')->first() ?: Unit::firstOrCreate(['name' => 'Roll', 'short_name' => 'roll']),
            'pair' => Unit::where('short_name', 'pair')->first() ?: Unit::firstOrCreate(['name' => 'Pair', 'short_name' => 'pair']),
            'sheet' => Unit::where('short_name', 'sheet')->first() ?: Unit::firstOrCreate(['name' => 'Sheet', 'short_name' => 'sheet']),
            'tank' => Unit::where('short_name', 'tank')->first() ?: Unit::firstOrCreate(['name' => 'Tank', 'short_name' => 'tank']),
        ];

        $products = [
            [
                'name' => 'แอร์ติดผนัง Daikin Sabai Plus 9000 BTU',
                'description' => 'รุ่น FTKQ09TV2S / RKQ09TV2S ระบบอินเวอร์เตอร์ น้ำยา R32',
                'price' => 12900.00,
                'stock' => 10,
                'sku' => 'TH-DAI-SABAI-09',
                'category_key' => 'wall',
                'brand_key' => 'daikin',
                'unit_key' => 'set',
            ],
            [
                'name' => 'แอร์ติดผนัง Daikin Sabai Plus 12000 BTU',
                'description' => 'รุ่น FTKQ12TV2S / RKQ12TV2S ระบบอินเวอร์เตอร์ น้ำยา R32',
                'price' => 15900.00,
                'stock' => 8,
                'sku' => 'TH-DAI-SABAI-12',
                'category_key' => 'wall',
                'brand_key' => 'daikin',
                'unit_key' => 'set',
            ],
            [
                'name' => 'แอร์ติดผนัง Mitsubishi Mr.Slim Happy 9000 BTU',
                'description' => 'รุ่น MSY-KT09VF อินเวอร์เตอร์ ประหยัดไฟเบอร์ 5',
                'price' => 13500.00,
                'stock' => 12,
                'sku' => 'TH-MIT-HAPPY-09',
                'category_key' => 'wall',
                'brand_key' => 'mitsubishi',
                'unit_key' => 'set',
            ],
            [
                'name' => 'แอร์ติดผนัง Mitsubishi Mr.Slim Happy 12000 BTU',
                'description' => 'รุ่น MSY-KT13VF อินเวอร์เตอร์ เหมาะกับห้องนอน',
                'price' => 16500.00,
                'stock' => 9,
                'sku' => 'TH-MIT-HAPPY-12',
                'category_key' => 'wall',
                'brand_key' => 'mitsubishi',
                'unit_key' => 'set',
            ],
            [
                'name' => 'แอร์แขวนใต้ฝ้า Carrier 36000 BTU',
                'description' => 'แอร์แขวนใต้ฝ้า เหมาะกับร้านอาหารและออฟฟิศขนาดกลาง',
                'price' => 38900.00,
                'stock' => 4,
                'sku' => 'TH-CARRIER-CEIL-36',
                'category_key' => 'ceiling',
                'brand_key' => 'carrier',
                'unit_key' => 'set',
            ],
            [
                'name' => 'แอร์ฝังฝ้า 4 ทิศทาง Daikin 24000 BTU',
                'description' => 'แอร์ฝังฝ้า 4 ทิศทาง เหมาะกับสำนักงาน พื้นที่เปิดโล่ง',
                'price' => 45900.00,
                'stock' => 3,
                'sku' => 'TH-DAI-CASSETTE-24',
                'category_key' => 'cassette',
                'brand_key' => 'daikin',
                'unit_key' => 'set',
            ],
            [
                'name' => 'แอร์ตู้ตั้งพื้น Central Air 30000 BTU',
                'description' => 'แอร์ตู้ตั้งพื้นสำหรับโชว์รูมและห้องโถง',
                'price' => 42000.00,
                'stock' => 2,
                'sku' => 'TH-CAIR-FLOOR-30',
                'category_key' => 'floor',
                'brand_key' => 'centralair',
                'unit_key' => 'set',
            ],
            [
                'name' => 'คอมเพรสเซอร์แอร์ 12000 BTU',
                'description' => 'อะไหล่คอมเพรสเซอร์สำหรับแอร์ติดผนัง 12000 BTU',
                'price' => 4500.00,
                'stock' => 6,
                'sku' => 'TH-COMP-12',
                'category_key' => 'spare',
                'brand_key' => 'mitsubishi',
                'unit_key' => 'unit',
            ],
            [
                'name' => 'ท่อทองแดงคู่พร้อมฉนวน 1/4" x 3/8" ยาว 15 เมตร',
                'description' => 'ท่อทองแดงสำหรับติดตั้งแอร์บ้าน พร้อมฉนวนโฟม',
                'price' => 2200.00,
                'stock' => 20,
                'sku' => 'TH-CU-1438-15M',
                'category_key' => 'install',
                'brand_key' => null,
                'unit_key' => 'roll',
            ],
            [
                'name' => 'ขายางคอมเพรสเซอร์แอร์ (คู่)',
                'description' => 'ขายางรองคอมเพรสเซอร์ ลดการสั่นและเสียงรบกวน',
                'price' => 180.00,
                'stock' => 50,
                'sku' => 'TH-COMP-FOOT-PAIR',
                'category_key' => 'install',
                'brand_key' => null,
                'unit_key' => 'pair',
            ],
            [
                'name' => 'แถบครอบท่อแอร์ PVC สีขาว 2 เมตร',
                'description' => 'ครอบท่อแอร์สำหรับงานเดินท่อภายนอกอาคาร',
                'price' => 250.00,
                'stock' => 40,
                'sku' => 'TH-DUCT-COVER-2M',
                'category_key' => 'install',
                'brand_key' => null,
                'unit_key' => 'unit',
            ],
            [
                'name' => 'ปั๊มแวคคั่มงานแอร์ 1 สเตจ',
                'description' => 'ปั๊มดูดสุญญากาศสำหรับติดตั้งแอร์บ้าน',
                'price' => 2500.00,
                'stock' => 8,
                'sku' => 'TH-TOOL-VAC-1',
                'category_key' => 'tools',
                'brand_key' => null,
                'unit_key' => 'unit',
            ],
            [
                'name' => 'ชุดเกจ์วัดน้ำยาแอร์ R32/R410a',
                'description' => 'เกจ์วัดความดันพร้อมสาย สำหรับงานติดตั้งและซ่อมแอร์',
                'price' => 1800.00,
                'stock' => 10,
                'sku' => 'TH-TOOL-GAUGE-R32',
                'category_key' => 'tools',
                'brand_key' => null,
                'unit_key' => 'set',
            ],
            [
                'name' => 'น้ำยาแอร์ R32 ถัง 3 กิโลกรัม',
                'description' => 'น้ำยาแอร์ R32 สำหรับเติมระบบอินเวอร์เตอร์',
                'price' => 1500.00,
                'stock' => 15,
                'sku' => 'TH-GAS-R32-3KG',
                'category_key' => 'spare',
                'brand_key' => null,
                'unit_key' => 'tank',
            ],
        ];

        foreach ($products as $data) {
            $category = $categoryMap[$data['category_key']] ?? null;
            if (!$category) {
                continue;
            }

            $brand = $data['brand_key'] ? ($brandMap[$data['brand_key']] ?? null) : null;
            $unit = $units[$data['unit_key']] ?? null;

            Product::updateOrCreate(
                ['sku' => $data['sku']],
                [
                    'name' => $data['name'],
                    'slug' => Str::slug($data['name']) . '-' . strtolower($data['sku']),
                    'description' => $data['description'],
                    'price' => $data['price'],
                    'stock' => $data['stock'],
                    'category_id' => $category->id,
                    'brand_id' => $brand ? $brand->id : null,
                    'unit_id' => $unit ? $unit->id : null,
                    'warehouse_id' => $warehouse?->id,
                    'sku' => $data['sku'],
                    'product_type' => 'single',
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
