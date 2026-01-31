<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Product::create([
            'name' => 'Air Conditioner 9000 BTU',
            'description' => 'Cool air for small room',
            'price' => 12000.00,
            'stock' => 10,
            'sku' => 'AC-9000',
        ]);

        Product::create([
            'name' => 'Air Conditioner 12000 BTU',
            'description' => 'Cool air for medium room',
            'price' => 15000.00,
            'stock' => 5,
            'sku' => 'AC-12000',
        ]);

        Product::create([
            'name' => 'Copper Pipe 1m',
            'description' => 'High quality copper pipe',
            'price' => 350.00,
            'stock' => 100,
            'sku' => 'PIPE-01',
        ]);
    }
}
