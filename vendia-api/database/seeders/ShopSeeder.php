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
        if (Shop::count() === 0) {
            Shop::create([
                'name' => 'Vendia POS',
                'address' => 'Default Address',
                'phone' => '000-000-0000',
                'logo_path' => null,
            ]);
        }
    }
}
