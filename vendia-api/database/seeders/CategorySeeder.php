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
            ['name' => 'Wall Type', 'description' => 'แอร์ติดผนัง'],
            ['name' => 'Ceiling Type', 'description' => 'แอร์แขวนใต้ฝ้า'],
            ['name' => 'Cassette Type', 'description' => 'แอร์ฝังฝ้า 4 ทิศทาง'],
            ['name' => 'Floor Standing', 'description' => 'แอร์ตู้ตั้งพื้น'],
            ['name' => 'Ducted Type', 'description' => 'แอร์เปลือย / แอร์ต่อท่อลม'],
            ['name' => 'VRV/VRF System', 'description' => 'ระบบแอร์ VRV/VRF'],
            ['name' => 'Portable Air Conditioner', 'description' => 'แอร์เคลื่อนที่'],
            ['name' => 'Installation Equipment', 'description' => 'อุปกรณ์ติดตั้ง'],
            ['name' => 'Spare Parts', 'description' => 'อะไหล่แอร์'],
            ['name' => 'Tools', 'description' => 'เครื่องมือช่าง'],
        ];

        foreach ($categories as $category) {
            Category::firstOrCreate(['name' => $category['name']], $category);
        }
    }
}
