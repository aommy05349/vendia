<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Category;
use App\Models\Brand;
use App\Models\Unit;
use App\Models\Warehouse;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $warehouse = Warehouse::firstOrCreate([
            'name' => 'Main Warehouse',
            'address' => '123 Main St, New York, NY 10001',
            'phone' => '123-456-7890',
            'email' => 'warehouse1@vendia.com'
        ]);

        $units = [
            'set' => Unit::where('short_name', 'set')->first(),
            'unit' => Unit::where('short_name', 'unit')->first(),
            'roll' => Unit::where('short_name', 'roll')->first(),
            'line' => Unit::where('short_name', 'line')->first(),
            'can' => Unit::where('short_name', 'can')->first(),
            'btl' => Unit::where('short_name', 'btl')->first(),
            'tank' => Unit::where('short_name', 'tank')->first(),
            'pair' => Unit::where('short_name', 'pair')->first(),
            'sheet' => Unit::where('short_name', 'sheet')->first(),
            'ft' => Unit::where('short_name', 'ft')->first(),
            'in' => Unit::where('short_name', 'in')->first(),
        ];

        // Ensure we have fallback units if some are missing
        if (!$units['set']) $units['set'] = Unit::firstOrCreate(['name' => 'Set', 'short_name' => 'set']);
        if (!$units['unit']) $units['unit'] = Unit::firstOrCreate(['name' => 'Unit', 'short_name' => 'unit']);

        $brands = [
            'daikin' => Brand::where('name', 'Daikin')->first(),
            'mitsubishi' => Brand::where('name', 'Mitsubishi Electric')->first(),
            'carrier' => Brand::where('name', 'Carrier')->first(),
            'panasonic' => Brand::where('name', 'Panasonic')->first(),
            'lg' => Brand::where('name', 'LG')->first(),
            'haier' => Brand::where('name', 'Haier')->first(),
            'saijo' => Brand::where('name', 'Saijo Denki')->first(),
            'york' => Brand::where('name', 'York')->first(),
            'toshiba' => Brand::where('name', 'Toshiba')->first(),
            'sharp' => Brand::where('name', 'Sharp')->first(),
        ];
        
        // Helper to get ID safely
        $getBrandId = fn($key) => $brands[$key]->id ?? null;
        $getUnitId = fn($key) => $units[$key]->id ?? null;

        $categories = [
            'Wall Type' => [
                [
                    'name' => 'Daikin Sabai Plus Inverter 9000 BTU',
                    'description' => 'FTKQ09TV2S / RKQ09TV2S - R32',
                    'price' => 12900.00,
                    'stock' => 20,
                    'sku' => 'DAIKIN-SABAI-09',
                    'brand_key' => 'daikin',
                    'unit_key' => 'set',
                ],
                [
                    'name' => 'Daikin Sabai Plus Inverter 12000 BTU',
                    'description' => 'FTKQ12TV2S / RKQ12TV2S - R32',
                    'price' => 15900.00,
                    'stock' => 15,
                    'sku' => 'DAIKIN-SABAI-12',
                    'brand_key' => 'daikin',
                    'unit_key' => 'set',
                ],
                [
                    'name' => 'Mitsubishi Mr.Slim Happy Inverter 9000 BTU',
                    'description' => 'MSY-KT09VF - R32',
                    'price' => 13500.00,
                    'stock' => 25,
                    'sku' => 'MIT-HAPPY-09',
                    'brand_key' => 'mitsubishi',
                    'unit_key' => 'set',
                ],
                [
                    'name' => 'Mitsubishi Mr.Slim Happy Inverter 12000 BTU',
                    'description' => 'MSY-KT13VF - R32',
                    'price' => 16500.00,
                    'stock' => 18,
                    'sku' => 'MIT-HAPPY-12',
                    'brand_key' => 'mitsubishi',
                    'unit_key' => 'set',
                ],
                [
                    'name' => 'Carrier XInverter Plus 12000 BTU',
                    'description' => '42TVAB013 / 38TVAB013 - WiFi Built-in',
                    'price' => 18900.00,
                    'stock' => 10,
                    'sku' => 'CARRIER-X-12',
                    'brand_key' => 'carrier',
                    'unit_key' => 'set',
                ],
                [
                    'name' => 'Panasonic Standard Inverter 9000 BTU',
                    'description' => 'CS-PU09XKT - Nanoe-G',
                    'price' => 13200.00,
                    'stock' => 12,
                    'sku' => 'PANA-INV-09',
                    'brand_key' => 'panasonic',
                    'unit_key' => 'set',
                ],
            ],
            'Ceiling Type' => [
                [
                    'name' => 'Daikin Ceiling FHA 18000 BTU',
                    'description' => 'FHA18CV2S / R18CV2S - Non-Inverter',
                    'price' => 25500.00,
                    'stock' => 5,
                    'sku' => 'DAIKIN-FHA-18',
                    'brand_key' => 'daikin',
                    'unit_key' => 'set',
                ],
                [
                    'name' => 'Mitsubishi Ceiling PCY-SM 24000 BTU',
                    'description' => 'PCY-SM24KAL - Inverter',
                    'price' => 38900.00,
                    'stock' => 3,
                    'sku' => 'MIT-PCY-24',
                    'brand_key' => 'mitsubishi',
                    'unit_key' => 'set',
                ],
                [
                    'name' => 'Carrier Ceiling TGV 30000 BTU',
                    'description' => '42TGV0301CP - Inverter XPower',
                    'price' => 42500.00,
                    'stock' => 4,
                    'sku' => 'CARRIER-TGV-30',
                    'brand_key' => 'carrier',
                    'unit_key' => 'set',
                ],
            ],
            'Cassette Type' => [
                [
                    'name' => 'Daikin Cassette FCFC 24000 BTU',
                    'description' => 'FCFC24DV2S - Inverter Round Flow',
                    'price' => 45900.00,
                    'stock' => 2,
                    'sku' => 'DAIKIN-FCFC-24',
                    'brand_key' => 'daikin',
                    'unit_key' => 'set',
                ],
                [
                    'name' => 'Mitsubishi Cassette PLY-SM 30000 BTU',
                    'description' => 'PLY-SM30EA - Inverter 4-Way',
                    'price' => 52000.00,
                    'stock' => 2,
                    'sku' => 'MIT-PLY-30',
                    'brand_key' => 'mitsubishi',
                    'unit_key' => 'set',
                ],
            ],
            'Spare Parts' => [
                [
                    'name' => 'Copper Pipe 1/4" (Roll)',
                    'description' => 'High quality copper pipe 15m',
                    'price' => 1200.00,
                    'stock' => 50,
                    'sku' => 'PIPE-14-ROLL',
                    'brand_key' => null,
                    'unit_key' => 'roll',
                ],
                [
                    'name' => 'Copper Pipe 3/8" (Roll)',
                    'description' => 'High quality copper pipe 15m',
                    'price' => 1800.00,
                    'stock' => 40,
                    'sku' => 'PIPE-38-ROLL',
                    'brand_key' => null,
                    'unit_key' => 'roll',
                ],
                [
                    'name' => 'Refrigerant R32 (Tank)',
                    'description' => '3kg tank for R32 system',
                    'price' => 1500.00,
                    'stock' => 30,
                    'sku' => 'GAS-R32-TANK',
                    'brand_key' => null,
                    'unit_key' => 'tank',
                ],
                [
                    'name' => 'Compressor Rotary 9000 BTU',
                    'description' => 'Replacement compressor for 9k BTU',
                    'price' => 4500.00,
                    'stock' => 10,
                    'sku' => 'COMP-ROT-09',
                    'brand_key' => 'mitsubishi',
                    'unit_key' => 'unit',
                ],
                [
                    'name' => 'Capacitor 35uF',
                    'description' => 'Run capacitor for compressor',
                    'price' => 150.00,
                    'stock' => 100,
                    'sku' => 'CAP-35',
                    'brand_key' => null,
                    'unit_key' => 'unit',
                ],
                [
                    'name' => 'Wall Bracket (Pair)',
                    'description' => 'Condensing unit wall bracket 45cm',
                    'price' => 250.00,
                    'stock' => 80,
                    'sku' => 'BRACKET-45',
                    'brand_key' => null,
                    'unit_key' => 'pair',
                ],
                [
                    'name' => 'Air Filter Sheet',
                    'description' => 'Universal air filter sheet',
                    'price' => 100.00,
                    'stock' => 200,
                    'sku' => 'FILTER-SHEET',
                    'brand_key' => null,
                    'unit_key' => 'sheet',
                ],
            ],
            'Tools' => [
                [
                    'name' => 'Vacuum Pump 1 Stage',
                    'description' => 'Rotary vane vacuum pump',
                    'price' => 2500.00,
                    'stock' => 10,
                    'sku' => 'TOOL-VAC-1',
                    'brand_key' => null,
                    'unit_key' => 'unit',
                ],
                [
                    'name' => 'Manifold Gauge Set R32/R410',
                    'description' => 'High/Low pressure gauge with hoses',
                    'price' => 1800.00,
                    'stock' => 15,
                    'sku' => 'TOOL-GAUGE-R32',
                    'brand_key' => null,
                    'unit_key' => 'set',
                ],
                [
                    'name' => 'Flaring Tool Kit',
                    'description' => 'Pipe flaring tool for 1/4-3/4 inch',
                    'price' => 1200.00,
                    'stock' => 12,
                    'sku' => 'TOOL-FLARE',
                    'brand_key' => null,
                    'unit_key' => 'set',
                ],
                [
                    'name' => 'Clamp Meter',
                    'description' => 'Digital clamp meter for AC current',
                    'price' => 900.00,
                    'stock' => 20,
                    'sku' => 'TOOL-CLAMP',
                    'brand_key' => null,
                    'unit_key' => 'unit',
                ],
            ]
        ];

        foreach ($categories as $catName => $productsList) {
            $category = Category::where('name', $catName)->first();
            if (!$category) continue;

            foreach ($productsList as $p) {
                Product::firstOrCreate(
                    ['sku' => $p['sku']],
                    [
                        'name' => $p['name'],
                        'description' => $p['description'],
                        'price' => $p['price'],
                        'stock' => $p['stock'],
                        'sku' => $p['sku'],
                        'category_id' => $category->id,
                        'warehouse_id' => $warehouse->id,
                        'brand_id' => $p['brand_key'] ? $getBrandId($p['brand_key']) : null,
                        'unit_id' => $p['unit_key'] ? $getUnitId($p['unit_key']) : null,
                        'slug' => Str::slug($p['name']) . '-' . Str::random(5),
                    ]
                );
            }
        }
    }
}
