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
            // International Brands
            ['name' => 'Daikin', 'image' => 'https://logo.clearbit.com/daikin.com'],
            ['name' => 'Mitsubishi Electric', 'image' => 'https://logo.clearbit.com/mitsubishielectric.com'],
            ['name' => 'Carrier', 'image' => 'https://logo.clearbit.com/carrier.com'],
            ['name' => 'Panasonic', 'image' => 'https://logo.clearbit.com/panasonic.com'],
            ['name' => 'LG', 'image' => 'https://logo.clearbit.com/lg.com'],
            ['name' => 'Haier', 'image' => 'https://logo.clearbit.com/haier.com'],
            ['name' => 'York', 'image' => 'https://logo.clearbit.com/york.com'],
            ['name' => 'Toshiba', 'image' => 'https://logo.clearbit.com/toshiba.com'],
            ['name' => 'Sharp', 'image' => 'https://logo.clearbit.com/sharp.com'],
            ['name' => 'Hitachi', 'image' => 'https://logo.clearbit.com/hitachi.com'],
            ['name' => 'Trane', 'image' => 'https://logo.clearbit.com/trane.com'],
            ['name' => 'Fujitsu', 'image' => 'https://logo.clearbit.com/fujitsu-general.com'],
            
            // Thai/Local Brands
            ['name' => 'Saijo Denki', 'image' => 'https://logo.clearbit.com/saijo-denki.co.th'],
            ['name' => 'Central Air', 'image' => 'https://logo.clearbit.com/centralair.co.th'],
            ['name' => 'Amena', 'image' => 'https://logo.clearbit.com/amena-air.com'],
            ['name' => 'Tasaki', 'image' => 'https://logo.clearbit.com/tasaki.co.th'],
            ['name' => 'Uni-Aire', 'image' => 'https://logo.clearbit.com/uni-aire.com'],
            ['name' => 'Star Aire', 'image' => 'https://logo.clearbit.com/staraire.com'],
            ['name' => 'Eminent', 'image' => 'https://logo.clearbit.com/eminent.co.th'],
        ];

        foreach ($brands as $brand) {
            Brand::updateOrCreate(
                ['name' => $brand['name']],
                ['image' => $brand['image']]
            );
        }
    }
}
