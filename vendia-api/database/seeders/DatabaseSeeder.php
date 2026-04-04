<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@vendia.com'],
            [
                'name' => 'Admin User',
                'username' => 'admin',
                'first_name' => 'Admin',
                'last_name' => 'User',
                'password' => 'password',
                'role' => 'admin',
                'phone' => '0812345678',
            ]
        );

        User::updateOrCreate(
            ['email' => 'staff@vendia.com'],
            [
                'name' => 'Staff User',
                'username' => 'staff',
                'first_name' => 'Staff',
                'last_name' => 'User',
                'password' => 'password',
                'role' => 'staff',
                'phone' => '0812345679',
            ]
        );

        $this->call([
            ShopSeeder::class,
            CategorySeeder::class,
            BrandSeeder::class,
            UnitSeeder::class,
            WarehouseSeeder::class,
            ProductSeeder::class,
            ServiceProductSeeder::class,
            // RandomCustomerSeeder::class,
            RandomTechnicianSeeder::class,
            RandomProductSeeder::class,
            // RandomOrderSeeder::class,
            // RandomAppointmentSeeder::class,
            // RandomAttendanceSeeder::class,
        ]);
    }
}
