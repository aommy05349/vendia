<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('customer_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('order_id')->nullable()->constrained()->onDelete('set null');
            $table->string('title');
            $table->text('description')->nullable();
            $table->enum('status', ['scheduled', 'en_route', 'in_progress', 'completed', 'cancelled'])->default('scheduled');
            $table->dateTime('start_time');
            $table->dateTime('end_time')->nullable();
            
            // Location Snapshot
            $table->string('location_name')->nullable();
            $table->text('address');
            $table->decimal('latitude', 10, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->string('google_maps_link')->nullable();
            $table->string('contact_name')->nullable();
            $table->string('contact_phone')->nullable();
            
            $table->text('admin_notes')->nullable();
            $table->text('technician_notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
