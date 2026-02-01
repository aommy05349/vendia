<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Unit;

class UnitSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $units = [
            // Air Conditioner Units
            ['name' => 'ชุด', 'short_name' => 'ชุด'],
            ['name' => 'เครื่อง', 'short_name' => 'เครื่อง'],
            // Air Conditioner Spare Parts Units
            ['name' => 'ม้วน', 'short_name' => 'ม้วน'], // Roll
            ['name' => 'เส้น', 'short_name' => 'เส้น'], // Line
            ['name' => 'กระป๋อง', 'short_name' => 'กป.'], // Can
            ['name' => 'ขวด', 'short_name' => 'ขวด'], // Bottle
            ['name' => 'ถัง', 'short_name' => 'ถัง'], // Tank
            ['name' => 'คู่', 'short_name' => 'คู่'], // Pair
            ['name' => 'แผ่น', 'short_name' => 'แผ่น'], // Sheet
            ['name' => 'ฟุต', 'short_name' => 'ฟุต'], // Foot
            ['name' => 'เมตร', 'short_name' => 'เมตร'], // Meter
            ['name' => 'นิ้ว', 'short_name' => 'นิ้ว'], // Inch
            ['name' => 'กล่อง', 'short_name' => 'กล่อง'], // Box
            ['name' => 'อัน', 'short_name' => 'อัน'], // Piece
        ];

        foreach ($units as $unit) {
            Unit::firstOrCreate(['short_name' => $unit['short_name']], $unit);
        }
    }
}
