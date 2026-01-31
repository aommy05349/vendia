<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Brand;

class BrandSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $brands = [
            // Air Conditioner Brands
            ['name' => 'Daikin', 'image' => null],
            ['name' => 'Mitsubishi Electric', 'image' => null],
            ['name' => 'Carrier', 'image' => null],
            ['name' => 'Panasonic', 'image' => null],
            ['name' => 'LG', 'image' => null],
            ['name' => 'Haier', 'image' => null],
            ['name' => 'Saijo Denki', 'image' => null],
            ['name' => 'York', 'image' => null],
            ['name' => 'Toshiba', 'image' => null],
            ['name' => 'Sharp', 'image' => null],
        ];

        foreach ($brands as $brand) {
            Brand::firstOrCreate(['name' => $brand['name']], $brand);
        }
    }
}
