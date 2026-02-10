<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Category;
use App\Models\Brand;
use App\Models\Unit;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class RandomProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Ensure dependencies exist
        if (Category::count() == 0) Category::factory()->count(5)->create();
        if (Brand::count() == 0) Brand::factory()->count(5)->create();
        if (Unit::count() == 0) Unit::factory()->count(3)->create();
        if (Warehouse::count() == 0) Warehouse::factory()->count(1)->create();

        Product::factory()
            ->count(20)
            ->state(function (array $attributes) {
                return [
                    'category_id' => Category::inRandomOrder()->first()->id,
                    'brand_id' => Brand::inRandomOrder()->first()->id,
                    'unit_id' => Unit::inRandomOrder()->first()->id,
                    'warehouse_id' => Warehouse::inRandomOrder()->first()->id,
                ];
            })
            ->create();
    }
}
