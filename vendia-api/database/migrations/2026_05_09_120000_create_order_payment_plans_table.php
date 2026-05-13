<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_payment_plans', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->decimal('total', 12, 2);
            $table->decimal('down_payment', 12, 2)->nullable();
            $table->unsignedInteger('installment_count');
            $table->decimal('installment_amount', 12, 2);
            $table->date('start_date')->nullable();
            $table->unsignedTinyInteger('due_day')->nullable();
            $table->string('status')->default('active');
            $table->timestamps();

            $table->unique('order_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_payment_plans');
    }
};

