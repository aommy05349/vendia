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
        if (!User::where('email', 'admin@vendia.com')->orWhere('username', 'admin')->exists()) {
            User::factory()->create([
                'name' => 'Admin User',
                'username' => 'admin',
                'first_name' => 'Admin',
                'last_name' => 'User',
                'email' => 'admin@vendia.com',
                'password' => 'password',
                'role' => 'admin',
            ]);
        }

        if (!User::where('email', 'staff@vendia.com')->orWhere('username', 'staff')->exists()) {
            User::factory()->create([
                'name' => 'Staff User',
                'username' => 'staff',
                'first_name' => 'Staff',
                'last_name' => 'User',
                'email' => 'staff@vendia.com',
                'password' => 'password',
                'role' => 'staff',
            ]);
        }

        $this->call([
            ShopSeeder::class,
            CategorySeeder::class,
            BrandSeeder::class,
            UnitSeeder::class,
            WarehouseSeeder::class,
            ProductSeeder::class,
        ]);
    }
}
