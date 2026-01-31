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
            ['name' => 'Set', 'short_name' => 'set'],
            ['name' => 'Unit', 'short_name' => 'unit'],
            // Air Conditioner Spare Parts Units
            ['name' => 'Roll', 'short_name' => 'roll'], // ม้วน (ท่อ, เทป)
            ['name' => 'Line', 'short_name' => 'line'], // เส้น (ราง, ท่อ)
            ['name' => 'Can', 'short_name' => 'can'], // กระป๋อง (สเปรย์, น้ำยา)
            ['name' => 'Bottle', 'short_name' => 'btl'], // ขวด (น้ำยาเคมี)
            ['name' => 'Tank', 'short_name' => 'tank'], // ถัง (น้ำยาแอร์)
            ['name' => 'Pair', 'short_name' => 'pair'], // คู่ (ขาแขวน)
            ['name' => 'Sheet', 'short_name' => 'sheet'], // แผ่น (ฟิลเตอร์)
            ['name' => 'Foot', 'short_name' => 'ft'], // ฟุต (ท่อ)
            ['name' => 'Inch', 'short_name' => 'in'], // นิ้ว
        ];

        foreach ($units as $unit) {
            Unit::firstOrCreate(['short_name' => $unit['short_name']], $unit);
        }
    }
}
