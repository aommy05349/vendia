<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\CustomerLocation;
use Illuminate\Database\Seeder;

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
                'address' => '99/1 หมู่ 3 ต.สุเทพ อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50200',
                'latitude' => 18.78750000,
                'longitude' => 98.96980000,
            ],
            [
                'name' => 'คุณสุภาพร ใจดี',
                'first_name' => 'สุภาพร',
                'last_name' => 'ใจดี',
                'email' => 'customer002@vendia.com',
                'phone' => '0900000002',
                'address' => '55/9 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50200',
                'latitude' => 18.79600000,
                'longitude' => 98.96930000,
            ],
            [
                'name' => 'คุณอนุชา ทองแท้',
                'first_name' => 'อนุชา',
                'last_name' => 'ทองแท้',
                'email' => 'customer003@vendia.com',
                'phone' => '0900000003',
                'address' => '128 หมู่บ้านสีทอง ต.สันทรายหลวง อ.สันทราย จ.เชียงใหม่ 50210',
                'latitude' => 18.83200000,
                'longitude' => 99.01650000,
            ],
            [
                'name' => 'คุณจันทร์เพ็ญ รุ่งเรือง',
                'first_name' => 'จันทร์เพ็ญ',
                'last_name' => 'รุ่งเรือง',
                'email' => 'customer004@vendia.com',
                'phone' => '0900000004',
                'address' => '21/7 หมู่ 5 ต.ฟ้าฮ่าม อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50000',
                'latitude' => 18.80720000,
                'longitude' => 99.01690000,
            ],
            [
                'name' => 'บริษัท บ้านเย็น จำกัด',
                'first_name' => 'บริษัท',
                'last_name' => 'บ้านเย็น',
                'email' => 'customer005@vendia.com',
                'phone' => '021234567',
                'address' => '333 ถ.ซุปเปอร์ไฮเวย์เชียงใหม่-ลำปาง ต.หนองป่าครั่ง อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50000',
                'company_name' => 'บริษัท บ้านเย็น จำกัด',
                'tax_id' => '0105555000001',
                'latitude' => 18.79480000,
                'longitude' => 99.03050000,
            ],
            [
                'name' => 'บริษัท คอนโดวิวแม่น้ำ จำกัด',
                'first_name' => 'บริษัท',
                'last_name' => 'คอนโดวิวแม่น้ำ',
                'email' => 'customer006@vendia.com',
                'phone' => '026789012',
                'address' => '88/88 ถ.เชียงใหม่-ลำพูน ต.หนองหอย อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50000',
                'company_name' => 'บริษัท คอนโดวิวแม่น้ำ จำกัด',
                'tax_id' => '0105555000002',
                'latitude' => 18.76850000,
                'longitude' => 99.01620000,
            ],
            [
                'name' => 'คุณนฤมล อยู่เย็น',
                'first_name' => 'นฤมล',
                'last_name' => 'อยู่เย็น',
                'email' => 'customer007@vendia.com',
                'phone' => '0900000005',
                'address' => '45/6 หมู่บ้านสวนริมดอย ต.แม่เหียะ อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50100',
                'latitude' => 18.75100000,
                'longitude' => 98.96820000,
            ],
            [
                'name' => 'คุณพงษ์ศักดิ์ แก้วใส',
                'first_name' => 'พงษ์ศักดิ์',
                'last_name' => 'แก้วใส',
                'email' => 'customer008@vendia.com',
                'phone' => '0900000006',
                'address' => '12/3 หมู่ 2 ต.แม่ริม อ.แม่ริม จ.เชียงใหม่ 50180',
                'latitude' => 18.89200000,
                'longitude' => 98.95800000,
            ],
            [
                'name' => 'คุณกิตติศักดิ์ บ้านสวย',
                'first_name' => 'กิตติศักดิ์',
                'last_name' => 'บ้านสวย',
                'email' => 'customer009@vendia.com',
                'phone' => '0900000007',
                'address' => '77/12 หมู่บ้านพฤกษา ต.สันกำแพง อ.สันกำแพง จ.เชียงใหม่ 50130',
                'latitude' => 18.74800000,
                'longitude' => 99.14100000,
            ],
            [
                'name' => 'คุณปิยนุช เย็นสบาย',
                'first_name' => 'ปิยนุช',
                'last_name' => 'เย็นสบาย',
                'email' => 'customer010@vendia.com',
                'phone' => '0900000008',
                'address' => '9/99 หมู่ 9 ต.สารภี อ.สารภี จ.เชียงใหม่ 50140',
                'latitude' => 18.68800000,
                'longitude' => 99.03800000,
            ],
            [
                'name' => 'คุณจิราพร ดอยคำ',
                'first_name' => 'จิราพร',
                'last_name' => 'ดอยคำ',
                'email' => 'customer011@vendia.com',
                'phone' => '0900000009',
                'address' => '101 หมู่ 4 ต.ดอนแก้ว อ.แม่ริม จ.เชียงใหม่ 50180',
                'latitude' => 18.88400000,
                'longitude' => 98.95600000,
            ],
            [
                'name' => 'คุณวรพันธ์ เจริญเมือง',
                'first_name' => 'วรพันธ์',
                'last_name' => 'เจริญเมือง',
                'email' => 'customer012@vendia.com',
                'phone' => '0900000010',
                'address' => '202 หมู่ 6 ต.สันผีเสื้อ อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50300',
                'latitude' => 18.82400000,
                'longitude' => 98.98000000,
            ],
            [
                'name' => 'คุณเกษมศรี ทุ่งแก้ว',
                'first_name' => 'เกษมศรี',
                'last_name' => 'ทุ่งแก้ว',
                'email' => 'customer013@vendia.com',
                'phone' => '0900000011',
                'address' => '55 หมู่ 3 ต.ป่าแดด อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50100',
                'latitude' => 18.75700000,
                'longitude' => 98.98600000,
            ],
            [
                'name' => 'คุณเอกลักษณ์ ดอยสุเทพ',
                'first_name' => 'เอกลักษณ์',
                'last_name' => 'ดอยสุเทพ',
                'email' => 'customer014@vendia.com',
                'phone' => '0900000012',
                'address' => '88 หมู่ 9 ต.บ้านปง อ.หางดง จ.เชียงใหม่ 50230',
                'latitude' => 18.71800000,
                'longitude' => 98.89400000,
            ],
            [
                'name' => 'คุณภัทรานิษฐ์ วังตาล',
                'first_name' => 'ภัทรานิษฐ์',
                'last_name' => 'วังตาล',
                'email' => 'customer015@vendia.com',
                'phone' => '0900000013',
                'address' => '199 หมู่ 5 ต.สันผักหวาน อ.หางดง จ.เชียงใหม่ 50230',
                'latitude' => 18.72400000,
                'longitude' => 98.94400000,
            ],
            [
                'name' => 'บริษัท เชียงใหม่พลาซ่า จำกัด',
                'first_name' => 'บริษัท',
                'last_name' => 'เชียงใหม่พลาซ่า',
                'email' => 'customer016@vendia.com',
                'phone' => '053000111',
                'address' => '1 ถ.ช้างคลาน ต.ช้างคลาน อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50100',
                'company_name' => 'บริษัท เชียงใหม่พลาซ่า จำกัด',
                'tax_id' => '0505555000003',
                'latitude' => 18.77700000,
                'longitude' => 98.99800000,
            ],
            [
                'name' => 'บริษัท แอร์พาร์ควิลล์ จำกัด',
                'first_name' => 'บริษัท',
                'last_name' => 'แอร์พาร์ควิลล์',
                'email' => 'customer017@vendia.com',
                'phone' => '053000112',
                'address' => '50 หมู่ 2 ต.ท่าศาลา อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50000',
                'company_name' => 'บริษัท แอร์พาร์ควิลล์ จำกัด',
                'tax_id' => '0505555000004',
                'latitude' => 18.77100000,
                'longitude' => 99.03300000,
            ],
            [
                'name' => 'คุณณัฐพล ดอยสะเก็ด',
                'first_name' => 'ณัฐพล',
                'last_name' => 'ดอยสะเก็ด',
                'email' => 'customer018@vendia.com',
                'phone' => '0900000014',
                'address' => '77 หมู่ 7 ต.เชิงดอย อ.ดอยสะเก็ด จ.เชียงใหม่ 50220',
                'latitude' => 18.86400000,
                'longitude' => 99.12200000,
            ],
            [
                'name' => 'คุณสุรชัย สวนดอยคำ',
                'first_name' => 'สุรชัย',
                'last_name' => 'สวนดอยคำ',
                'email' => 'customer019@vendia.com',
                'phone' => '0900000015',
                'address' => '15 หมู่ 1 ต.แม่เหียะ อ.เมืองเชียงใหม่ จ.เชียงใหม่ 50100',
                'latitude' => 18.74600000,
                'longitude' => 98.94200000,
            ],
            [
                'name' => 'คุณภานุวัฒน์ สันป่าตอง',
                'first_name' => 'ภานุวัฒน์',
                'last_name' => 'สันป่าตอง',
                'email' => 'customer020@vendia.com',
                'phone' => '0900000016',
                'address' => '120 หมู่ 10 ต.สันป่าตอง อ.สันป่าตอง จ.เชียงใหม่ 50120',
                'latitude' => 18.58300000,
                'longitude' => 98.91500000,
            ],
        ];

        foreach ($customers as $index => $data) {
            $customer = Customer::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'first_name' => $data['first_name'],
                    'last_name' => $data['last_name'],
                    'phone' => $data['phone'],
                    'address' => $data['address'],
                    'company_name' => $data['company_name'] ?? null,
                    'tax_id' => $data['tax_id'] ?? null,
                ]
            );

            CustomerLocation::updateOrCreate(
                [
                    'customer_id' => $customer->id,
                    'address' => $data['address'],
                ],
                [
                    'name' => isset($data['company_name']) ? 'สำนักงาน' : 'บ้าน',
                    'latitude' => $data['latitude'] ?? null,
                    'longitude' => $data['longitude'] ?? null,
                    'google_maps_link' => null,
                    'contact_person' => $data['name'],
                    'contact_phone' => $data['phone'],
                    'is_default' => true,
                ]
            );
        }
    }
}
