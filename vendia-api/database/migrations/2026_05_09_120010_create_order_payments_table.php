<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('order_payment_plan_id')->nullable()->constrained('order_payment_plans')->nullOnDelete();
            $table->decimal('amount', 12, 2);
            $table->string('method');
            $table->dateTime('paid_at');
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('note')->nullable();
            $table->timestamps();

            $table->index(['order_id', 'paid_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_payments');
    }
};

