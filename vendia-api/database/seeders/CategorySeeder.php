<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;

class CategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = [
            ['name' => 'แอร์ติดผนัง', 'description' => 'Wall Type'],
            ['name' => 'แอร์แขวนใต้ฝ้า', 'description' => 'Ceiling Type'],
            ['name' => 'แอร์ฝังฝ้า 4 ทิศทาง', 'description' => 'Cassette Type'],
            ['name' => 'แอร์ตู้ตั้งพื้น', 'description' => 'Floor Standing'],
            ['name' => 'แอร์เปลือย / แอร์ต่อท่อลม', 'description' => 'Ducted Type'],
            ['name' => 'ระบบแอร์ VRV/VRF', 'description' => 'VRV/VRF System'],
            ['name' => 'แอร์เคลื่อนที่', 'description' => 'Portable Air Conditioner'],
            ['name' => 'อุปกรณ์ติดตั้ง', 'description' => 'Installation Equipment'],
            ['name' => 'อะไหล่แอร์', 'description' => 'Spare Parts'],
            ['name' => 'เครื่องมือช่าง', 'description' => 'Tools'],
            ['name' => 'การบริการ', 'description' => 'Services'],
            ['name' => 'ชุดสินค้า', 'description' => 'Product Sets'],
        ];

        foreach ($categories as $category) {
            Category::firstOrCreate(['name' => $category['name']], $category);
        }
    }
}
