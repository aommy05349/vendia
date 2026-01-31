<?php

namespace Tests\Feature\Api;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Tests\TestCase;

class PosTest extends TestCase
{
    use RefreshDatabase;

    public function test_staff_can_login()
    {
        $user = User::factory()->create([
            'email' => 'staff@vendia.com',
            'password' => bcrypt('password'),
            'role' => 'staff',
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'staff@vendia.com',
            'password' => 'password',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'access_token',
                'token_type',
                'user' => ['id', 'name', 'email', 'role'],
            ]);
    }

    public function test_can_list_products()
    {
        $user = User::factory()->create();
        Product::factory()->count(3)->create();

        $response = $this->actingAs($user)->getJson('/api/products');

        $response->assertStatus(200)
            ->assertJsonCount(3);
    }

    public function test_can_create_order()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create([
            'price' => 100,
            'stock' => 10,
        ]);

        $response = $this->actingAs($user)->postJson('/api/orders', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 2,
                ],
            ],
            'payment_method' => 'cash',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure(['id', 'total', 'status']);
        
        $this->assertDatabaseHas('orders', [
            'total' => 200,
            'user_id' => $user->id,
        ]);

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'stock' => 8, // 10 - 2
        ]);
    }

    public function test_cannot_order_more_than_stock()
    {
        $user = User::factory()->create();
        $product = Product::factory()->create([
            'stock' => 5,
        ]);

        $response = $this->actingAs($user)->postJson('/api/orders', [
            'items' => [
                [
                    'product_id' => $product->id,
                    'quantity' => 10,
                ],
            ],
            'payment_method' => 'cash',
        ]);

        $response->assertStatus(500); // Exception thrown
    }
}
