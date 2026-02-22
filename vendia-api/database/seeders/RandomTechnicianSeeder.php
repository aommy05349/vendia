<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class RandomTechnicianSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $technicians = [
            [
                'name' => 'กันต์',
                'first_name' => 'กันต์',
                'last_name' => '',
                'email' => 'tech001@vendia.com',
                'username' => 'tech001',
                'phone' => '0800000001',
            ],
            [
                'name' => 'นายจิรายุ จิตธรรม',
                'first_name' => 'นายจิรายุ',
                'last_name' => 'จิตธรรม',
                'email' => 'tech002@vendia.com',
                'username' => 'tech002',
                'phone' => '0800000002',
            ],
            [
                'name' => 'นายอํานาจ สร้อยทอง',
                'first_name' => 'นายอํานาจ',
                'last_name' => 'สร้อยทอง',
                'email' => 'tech003@vendia.com',
                'username' => 'tech003',
                'phone' => '0800000003',
            ],
            [
                'name' => 'นายวิชัย พกร',
                'first_name' => 'นายวิชัย',
                'last_name' => 'พกร',
                'email' => 'tech004@vendia.com',
                'username' => 'tech004',
                'phone' => '0800000004',
            ],
            [
                'name' => 'นายเทวฤทธิ กิติตุ้ย',
                'first_name' => 'นายเทวฤทธิ',
                'last_name' => 'กิติตุ้ย',
                'email' => 'tech005@vendia.com',
                'username' => 'tech005',
                'phone' => '0800000005',
            ],
        ];

        foreach ($technicians as $tech) {
            User::updateOrCreate(
                ['email' => $tech['email']],
                [
                    'name' => $tech['name'],
                    'first_name' => $tech['first_name'],
                    'last_name' => $tech['last_name'],
                    'username' => $tech['username'],
                    'phone' => $tech['phone'],
                    'role' => 'technician',
                    'password' => 'password',
                ]
            );
        }
    }
}
