<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Warehouse;

class WarehouseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $warehouses = [
            [
                'name' => 'Main Warehouse',
                'address' => '123 Main St, New York, NY 10001',
                'phone' => '123-456-7890',
                'email' => 'warehouse1@vendia.com'
            ],
            [
                'name' => 'West Coast Distribution Center',
                'address' => '456 West Blvd, Los Angeles, CA 90001',
                'phone' => '987-654-3210',
                'email' => 'warehouse2@vendia.com'
            ],
            [
                'name' => 'Europe Hub',
                'address' => '789 Euro Way, London, UK',
                'phone' => '+44 20 1234 5678',
                'email' => 'europe@vendia.com'
            ],
            [
                'name' => 'Asia Pacific Hub',
                'address' => '101 Asia St, Singapore',
                'phone' => '+65 1234 5678',
                'email' => 'asia@vendia.com'
            ],
        ];

        foreach ($warehouses as $warehouse) {
            Warehouse::firstOrCreate(['name' => $warehouse['name']], $warehouse);
        }
    }
}
