<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\CustomerLocation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class RandomCustomerSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $customers = [
            [
                'name' => 'คุณสมชาย แสงทอง',
                'first_name' => 'สมชาย',
                'last_name' => 'แสงทอง',
                'email' => 'customer001@vendia.com',
                'phone' => '0900000001',
                'address' => '99/1 หมู่ 3 ถ.สุขุมวิท ต.บางจาก อ.พระโขนง กรุงเทพฯ 10260',
            ],
            [
                'name' => 'คุณสุภาพร ใจดี',
                'first_name' => 'สุภาพร',
                'last_name' => 'ใจดี',
                'email' => 'customer002@vendia.com',
                'phone' => '0900000002',
                'address' => '55/9 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมือง เชียงใหม่ 50200',
            ],
            [
                'name' => 'คุณอนุชา ทองแท้',
                'first_name' => 'อนุชา',
                'last_name' => 'ทองแท้',
                'email' => 'customer003@vendia.com',
                'phone' => '0900000003',
                'address' => '128 หมู่บ้านสีทอง ซ.ประชาชื่น 22 แขวงวงศ์สว่าง เขตบางซื่อ กรุงเทพฯ 10800',
            ],
            [
                'name' => 'คุณจันทร์เพ็ญ รุ่งเรือง',
                'first_name' => 'จันทร์เพ็ญ',
                'last_name' => 'รุ่งเรือง',
                'email' => 'customer004@vendia.com',
                'phone' => '0900000004',
                'address' => '21/7 ซ.เทพประสิทธิ์ 5 ต.หนองปรือ อ.บางละมุง ชลบุรี 20150',
            ],
            [
                'name' => 'บริษัท บ้านเย็น จำกัด',
                'first_name' => 'บริษัท',
                'last_name' => 'บ้านเย็น',
                'email' => 'customer005@vendia.com',
                'phone' => '021234567',
                'address' => '333 ถ.พระราม 2 แขวงบางมด เขตจอมทอง กรุงเทพฯ 10150',
                'company_name' => 'บริษัท บ้านเย็น จำกัด',
                'tax_id' => '0105555000001',
            ],
            [
                'name' => 'บริษัท คอนโดวิวแม่น้ำ จำกัด',
                'first_name' => 'บริษัท',
                'last_name' => 'คอนโดวิวแม่น้ำ',
                'email' => 'customer006@vendia.com',
                'phone' => '026789012',
                'address' => '88/88 ถ.เจริญกรุง แขวงบางรัก เขตบางรัก กรุงเทพฯ 10500',
                'company_name' => 'บริษัท คอนโดวิวแม่น้ำ จำกัด',
                'tax_id' => '0105555000002',
            ],
            [
                'name' => 'คุณนฤมล อยู่เย็น',
                'first_name' => 'นฤมล',
                'last_name' => 'อยู่เย็น',
                'email' => 'customer007@vendia.com',
                'phone' => '0900000005',
                'address' => '45/6 หมู่บ้านสวนริมคลอง ต.เสม็ด อ.เมือง ชลบุรี 20000',
            ],
            [
                'name' => 'คุณพงษ์ศักดิ์ แก้วใส',
                'first_name' => 'พงษ์ศักดิ์',
                'last_name' => 'แก้วใส',
                'email' => 'customer008@vendia.com',
                'phone' => '0900000006',
                'address' => '12/3 ถ.สนามบิน ต.หาดใหญ่ อ.หาดใหญ่ สงขลา 90110',
            ],
            [
                'name' => 'คุณกิตติศักดิ์ บ้านสวย',
                'first_name' => 'กิตติศักดิ์',
                'last_name' => 'บ้านสวย',
                'email' => 'customer009@vendia.com',
                'phone' => '0900000007',
                'address' => '77/12 หมู่บ้านพฤกษา ต.คูคต อ.ลำลูกกา ปทุมธานี 12130',
            ],
            [
                'name' => 'คุณปิยนุช เย็นสบาย',
                'first_name' => 'ปิยนุช',
                'last_name' => 'เย็นสบาย',
                'email' => 'customer010@vendia.com',
                'phone' => '0900000008',
                'address' => '9/99 ถ.บางนา-ตราด กม.10 ต.บางพลีใหญ่ อ.บางพลี สมุทรปราการ 10540',
            ],
        ];

        foreach ($customers as $index => $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'username' => $data['email'] ?? 'customer' . Str::padLeft((string) ($index + 1), 3, '0'),
                    'phone' => $data['phone'],
                    'address' => $data['address'],
                    'company_name' => $data['company_name'] ?? null,
                    'tax_id' => $data['tax_id'] ?? null,
                    'role' => 'customer',
                    'password' => 'password',
                ]
            );

            CustomerLocation::updateOrCreate(
                [
                    'user_id' => $user->id,
                    'address' => $data['address'],
                ],
                [
                    'name' => isset($data['company_name']) ? 'สำนักงาน' : 'บ้าน',
                    'latitude' => null,
                    'longitude' => null,
                    'google_maps_link' => null,
                    'contact_person' => $data['name'],
                    'contact_phone' => $data['phone'],
                    'is_default' => true,
                ]
            );
        }
    }
}
