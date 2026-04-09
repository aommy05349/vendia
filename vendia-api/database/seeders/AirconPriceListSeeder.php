<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Unit;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class AirconPriceListSeeder extends Seeder
{
    public function run(): void
    {
        $warehouse = Warehouse::firstOrCreate(
            ['name' => 'Main Warehouse'],
            [
                'address' => '123 Main St, New York, NY 10001',
                'phone' => '123-456-7890',
                'email' => 'warehouse1@vendia.com',
            ]
        );

        $category = Category::firstOrCreate(
            ['name' => 'แอร์ติดผนัง'],
            ['description' => 'Wall Type']
        );

        $unit = Unit::firstOrCreate(
            ['short_name' => 'เครื่อง'],
            ['name' => 'เครื่อง', 'short_name' => 'เครื่อง']
        );

        $brands = [
            'Haier' => 'https://logo.clearbit.com/haier.com',
            'TCL' => 'https://logo.clearbit.com/tcl.com',
            'AUX' => null,
            'Star Aire' => 'https://logo.clearbit.com/staraire.com',
            'York' => 'https://logo.clearbit.com/york.com',
            'LG' => 'https://logo.clearbit.com/lg.com',
            'Samsung' => 'https://logo.clearbit.com/samsung.com',
            'Sharp' => 'https://logo.clearbit.com/sharp.com',
            'Daikin' => 'https://logo.clearbit.com/daikin.com',
            'Mitsubishi Electric' => 'https://logo.clearbit.com/mitsubishielectric.com',
            'Hisense' => 'https://logo.clearbit.com/hisense.com',
            'Midea' => 'https://logo.clearbit.com/midea.com',
            'Central Air' => 'https://logo.clearbit.com/centralair.co.th',
        ];

        $brandIds = [];
        foreach ($brands as $name => $image) {
            $brand = Brand::updateOrCreate(
                ['name' => $name],
                ['image' => $image]
            );
            $brandIds[$name] = $brand->id;
        }

        $stockDefault = 50;
        $quantityAlert = 10;

        $lists = [
            9000 => [
                ['brand' => 'Haier', 'price' => 13900, 'stock' => $stockDefault],
                ['brand' => 'TCL', 'price' => 13800, 'stock' => $stockDefault],
                ['brand' => 'AUX', 'price' => 11900, 'stock' => $stockDefault],
                ['brand' => 'Star Aire', 'price' => 13300, 'stock' => $stockDefault],
                ['brand' => 'York', 'price' => 13500, 'stock' => $stockDefault],
                ['brand' => 'LG', 'price' => 14500, 'stock' => $stockDefault],
                ['brand' => 'Samsung', 'price' => 14800, 'stock' => $stockDefault],
                ['brand' => 'Sharp', 'price' => 0, 'stock' => 0],
                ['brand' => 'Daikin', 'price' => 15700, 'stock' => $stockDefault],
                ['brand' => 'Mitsubishi Electric', 'price' => 15900, 'stock' => $stockDefault, 'variant' => 'Mr.Slim'],
                ['brand' => 'Hisense', 'price' => 12300, 'stock' => $stockDefault],
                ['brand' => 'Midea', 'price' => 14900, 'stock' => $stockDefault],
            ],
            12000 => [
                ['brand' => 'Haier', 'price' => 15500, 'stock' => $stockDefault],
                ['brand' => 'TCL', 'price' => 14900, 'stock' => $stockDefault],
                ['brand' => 'Hisense', 'price' => 13400, 'stock' => $stockDefault],
                ['brand' => 'Star Aire', 'price' => 14300, 'stock' => $stockDefault],
                ['brand' => 'York', 'price' => 14900, 'stock' => $stockDefault],
                ['brand' => 'LG', 'price' => 15900, 'stock' => $stockDefault],
                ['brand' => 'Midea', 'price' => 15900, 'stock' => $stockDefault],
                ['brand' => 'Samsung', 'price' => 16500, 'stock' => $stockDefault],
                ['brand' => 'Daikin', 'price' => 18700, 'stock' => $stockDefault],
                ['brand' => 'Mitsubishi Electric', 'price' => 18900, 'stock' => $stockDefault, 'variant' => 'Mr.Slim'],
                ['brand' => 'AUX', 'price' => 12900, 'stock' => $stockDefault],
                ['brand' => 'Central Air', 'price' => 16500, 'stock' => $stockDefault],
            ],
            18000 => [
                ['brand' => 'Haier', 'price' => 22500, 'stock' => $stockDefault],
                ['brand' => 'TCL', 'price' => 20500, 'stock' => $stockDefault],
                ['brand' => 'Central Air', 'price' => 20900, 'stock' => $stockDefault],
                ['brand' => 'Star Aire', 'price' => 22700, 'stock' => $stockDefault],
                ['brand' => 'York', 'price' => 23800, 'stock' => $stockDefault],
                ['brand' => 'LG', 'price' => 22400, 'stock' => $stockDefault],
                ['brand' => 'Samsung', 'price' => 23500, 'stock' => $stockDefault],
                ['brand' => 'Hisense', 'price' => 18500, 'stock' => $stockDefault],
                ['brand' => 'Daikin', 'price' => 29900, 'stock' => $stockDefault],
                ['brand' => 'Mitsubishi Electric', 'price' => 30700, 'stock' => $stockDefault, 'variant' => 'Mr.Slim'],
                ['brand' => 'AUX', 'price' => 18500, 'stock' => $stockDefault],
                ['brand' => 'Midea', 'price' => 21000, 'stock' => $stockDefault],
            ],
            24000 => [
                ['brand' => 'Haier', 'price' => 26900, 'stock' => $stockDefault],
                ['brand' => 'TCL', 'price' => 23500, 'stock' => $stockDefault],
                ['brand' => 'Hisense', 'price' => 23900, 'stock' => $stockDefault],
                ['brand' => 'Star Aire', 'price' => 28900, 'stock' => $stockDefault],
                ['brand' => 'York', 'price' => 26700, 'stock' => $stockDefault],
                ['brand' => 'LG', 'price' => 30500, 'stock' => $stockDefault],
                ['brand' => 'Samsung', 'price' => 27900, 'stock' => $stockDefault],
                ['brand' => 'Midea', 'price' => 26700, 'stock' => $stockDefault],
                ['brand' => 'Daikin', 'price' => 42500, 'stock' => $stockDefault],
                ['brand' => 'Mitsubishi Electric', 'price' => 45500, 'stock' => $stockDefault, 'variant' => 'Mr.Slim'],
                ['brand' => 'AUX', 'price' => 23900, 'stock' => $stockDefault],
            ],
        ];

        foreach ($lists as $btu => $items) {
            foreach ($items as $item) {
                $brandName = $item['brand'];
                $brandId = $brandIds[$brandName] ?? null;
                $variant = isset($item['variant']) && is_string($item['variant']) ? trim($item['variant']) : '';
                $variantSuffix = $variant !== '' ? " {$variant}" : '';

                $skuBrand = strtoupper(preg_replace('/[^A-Z0-9]+/i', '', $brandName) ?? $brandName);
                $skuVariant = $variant !== '' ? '-' . strtoupper(preg_replace('/[^A-Z0-9]+/i', '', $variant) ?? $variant) : '';
                $sku = "AC{$btu}-{$skuBrand}{$skuVariant}-INV-R32";

                $name = "{$brandName}{$variantSuffix} Inverter R32 {$btu} BTU (รวมติดตั้ง)";
                $description = 'รวมติดตั้งระบบพร้อมอุปกรณ์ติดตั้งครบ รับประกัน 3 ปี รับประกันศูนย์แท้ 100%';

                if ($brandName === 'Sharp' && ($item['stock'] ?? 0) === 0) {
                    $description = 'ของหมด';
                }

                Product::updateOrCreate(
                    ['sku' => $sku],
                    [
                        'name' => $name,
                        'description' => $description,
                        'price' => (float) $item['price'],
                        'stock' => (int) $item['stock'],
                        'quantity_alert' => $quantityAlert,
                        'product_type' => 'single',
                        'tax_type' => 'exclusive',
                        'tax_amount' => 0,
                        'discount_type' => 'fixed',
                        'discount_value' => 0,
                        'category_id' => $category->id,
                        'warehouse_id' => $warehouse->id,
                        'brand_id' => $brandId,
                        'unit_id' => $unit->id,
                        'barcode_symbology' => 'Code128',
                    ]
                );
            }
        }
    }
}

